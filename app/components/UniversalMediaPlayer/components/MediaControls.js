'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * MediaControls - Clean, modular media control interface
 * Handles play/pause, timeline, volume, and other controls
 */
const MediaControls = ({
  playerState,
  playerActions,
  onToggleFullscreen,
  qualities = [],
  onSelectQuality,
  currentQuality = 'auto',
  subtitles = [],
  onSelectSubtitle,
  activeSubtitle,
  mediaType,
  hasNextEpisode = false,
  hasPreviousEpisode = false,
  onNextEpisode,
  onPreviousEpisode,
  enableAdvanced = true,
  theme = 'dark',
  episodeCarouselVisible = false,
  onToggleEpisodeCarousel,
  progressData,
  onMarkCompleted,
  onClearProgress,
  onSaveProgress,
  isVisible = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const timelineRef = useRef(null);

  // Format time helper
  const formatTime = useCallback((seconds) => {
    if (!isFinite(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Timeline interaction handlers
  const handleTimelineMouseDown = useCallback((e) => {
    if (!timelineRef.current) return;

    setIsDragging(true);
    const rect = timelineRef.current.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    const time = progress * playerState.duration;

    setDragValue(time);
    playerActions.seek(time);
  }, [playerState.duration, playerActions]);

  const handleTimelineMouseMove = useCallback((e) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = progress * playerState.duration;

    setDragValue(time);
  }, [isDragging, playerState.duration]);

  const handleTimelineMouseUp = useCallback(() => {
    if (isDragging) {
      playerActions.seek(dragValue);
      setIsDragging(false);
    }
  }, [isDragging, dragValue, playerActions]);

  // Setup global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleTimelineMouseMove);
      document.addEventListener('mouseup', handleTimelineMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleTimelineMouseMove);
        document.removeEventListener('mouseup', handleTimelineMouseUp);
      };
    }
  }, [isDragging, handleTimelineMouseMove, handleTimelineMouseUp]);

  // Volume slider handler
  const handleVolumeChange = useCallback((e) => {
    const volume = parseFloat(e.target.value);
    playerActions.setVolume(volume);
  }, [playerActions]);

  // Quality selector
  const handleQualityChange = useCallback((e) => {
    onSelectQuality?.(e.target.value);
  }, [onSelectQuality]);

  // Subtitle selector
  const handleSubtitleChange = useCallback((e) => {
    onSelectSubtitle?.(e.target.value);
  }, [onSelectSubtitle]);

  if (!isVisible) return null;

  const progressPercent = playerState.duration > 0
    ? ((isDragging ? dragValue : playerState.currentTime) / playerState.duration) * 100
    : 0;

  const bufferedPercent = playerState.duration > 0
    ? (playerState.buffered / playerState.duration) * 100
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={styles.controlsContainer}
      >
        {/* Timeline */}
        <div className={styles.timelineContainer}>
          <div
            ref={timelineRef}
            className={`${styles.timeline} ${isDragging ? styles.timelineDragging : ''}`}
            onMouseDown={handleTimelineMouseDown}
          >
            {/* Buffered progress */}
            <div
              className={styles.timelineBuffered}
              style={{ width: `${bufferedPercent}%` }}
            />

            {/* Main progress */}
            <div
              className={styles.timelineProgress}
              style={{ width: `${progressPercent}%` }}
            />

            {/* Thumb */}
            <div
              className={styles.timelineThumb}
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Time display */}
          <div className={styles.timeDisplay}>
            <span className={styles.currentTime}>
              {formatTime(isDragging ? dragValue : playerState.currentTime)}
            </span>
            <span className={styles.timeSeparator}> / </span>
            <span className={styles.totalTime}>
              {formatTime(playerState.duration)}
            </span>
          </div>
        </div>

        {/* Main Controls Row */}
        <div className={styles.controlsRow}>
          {/* Left Controls */}
          <div className={styles.leftControls}>
            {/* Play/Pause */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={playerActions.togglePlay}
              className={`${styles.glassButton} ${styles.playButton}`}
              disabled={playerState.isLoading}
            >
              {playerState.isPlaying ? '⏸️' : '▶️'}
            </motion.button>

            {/* Previous Episode (TV only) */}
            {mediaType === 'tv' && hasPreviousEpisode && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPreviousEpisode}
                className={styles.glassButton}
                title="Previous Episode"
              >
                ⏮️
              </motion.button>
            )}

            {/* Next Episode (TV only) */}
            {mediaType === 'tv' && hasNextEpisode && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onNextEpisode}
                className={styles.glassButton}
                title="Next Episode"
              >
                ⏭️
              </motion.button>
            )}

            {/* Episode Carousel Toggle (TV only) */}
            {mediaType === 'tv' && enableAdvanced && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleEpisodeCarousel}
                className={`${styles.glassButton} ${episodeCarouselVisible ? styles.active : ''}`}
                title="Episode Carousel"
              >
                📺
              </motion.button>
            )}

            {/* Volume Controls */}
            <div className={styles.volumeContainer}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playerActions.toggleMute}
                className={styles.glassButton}
                title={playerState.isMuted ? 'Unmute' : 'Mute'}
              >
                {playerState.isMuted || playerState.volume === 0 ? '🔇' : '🔊'}
              </motion.button>

              {/* Volume Slider Container */}
              <div className={styles.volumeSliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={playerState.volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  title={`Volume: ${Math.round(playerState.volume * 100)}%`}
                />
                {/* Volume Fill Overlay */}
                <div
                  className={styles.volumeFill}
                  style={{
                    width: `${playerState.volume * 100}%`,
                    opacity: playerState.isMuted ? 0.5 : 1
                  }}
                />
                {/* Volume Thumb */}
                <div
                  className={styles.volumeThumb}
                  style={{
                    left: `${playerState.volume * 100}%`,
                    opacity: playerState.isMuted ? 0.5 : 1
                  }}
                />
              </div>
            </div>
          </div>

          {/* Center Controls */}
          <div className={styles.centerControls}>
            {/* Progress Actions */}
            {progressData && enableAdvanced && (
              <div className={styles.progressActions}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSaveProgress}
                  className={styles.glassButton}
                  title="Save Progress"
                >
                  💾
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onMarkCompleted}
                  className={styles.glassButton}
                  title="Mark Completed"
                >
                  ✅
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClearProgress}
                  className={styles.glassButton}
                  title="Clear Progress"
                >
                  🗑️
                </motion.button>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className={styles.rightControls}>
            {/* Quality Selector */}
            {qualities.length > 1 && (
              <select
                value={currentQuality}
                onChange={handleQualityChange}
                className={styles.controlSelect}
                title="Video Quality"
              >
                {qualities.map(quality => (
                  <option key={quality.id} value={quality.id}>
                    {quality.label}
                  </option>
                ))}
              </select>
            )}

            {/* Subtitle Selector */}
            {subtitles.length > 0 && (
              <select
                value={activeSubtitle || ''}
                onChange={handleSubtitleChange}
                className={styles.controlSelect}
                title="Subtitles"
              >
                <option value="">No Subtitles</option>
                {subtitles.map((subtitle, index) => {
                  // Handle both string and object subtitle formats
                  const value = typeof subtitle === 'object' ? subtitle.language || subtitle.langcode || subtitle.label || `Subtitle ${index + 1}` : subtitle;
                  const display = typeof subtitle === 'object' ? subtitle.language || subtitle.label || `Subtitle ${index + 1}` : subtitle;
                  return (
                    <option key={index} value={value}>
                      {display}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Fullscreen Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleFullscreen}
              className={`${styles.glassButton} ${styles.fullscreenButton}`}
              title={playerState.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {playerState.isFullscreen ? '🗗' : '🗖'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaControls;