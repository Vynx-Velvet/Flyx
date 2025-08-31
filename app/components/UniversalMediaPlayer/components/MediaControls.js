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

        {/* Main Controls Row - Simplified and Intuitive Layout */}
        <div className={styles.controlsRow}>
          {/* Primary Controls - Most Used */}
          <div className={styles.primaryControls}>
            {/* Play/Pause - Largest and Most Prominent */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={playerActions.togglePlay}
              className={`${styles.glassButton} ${styles.playButton} ${styles.primaryButton}`}
              disabled={playerState.isLoading}
              aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
            >
              {playerState.isPlaying ? '⏸️' : '▶️'}
            </motion.button>

            {/* Episode Navigation - TV Only, Simplified */}
            {mediaType === 'tv' && (hasPreviousEpisode || hasNextEpisode) && (
              <div className={styles.episodeControls}>
                {hasPreviousEpisode && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onPreviousEpisode}
                    className={`${styles.glassButton} ${styles.secondaryButton}`}
                    aria-label="Previous Episode"
                  >
                    ⏮️
                  </motion.button>
                )}

                {hasNextEpisode && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onNextEpisode}
                    className={`${styles.glassButton} ${styles.secondaryButton}`}
                    aria-label="Next Episode"
                  >
                    ⏭️
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Secondary Controls - Less Frequently Used */}
          <div className={styles.secondaryControls}>
            {/* Volume Controls - Simplified */}
            <div className={styles.volumeContainer}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playerActions.toggleMute}
                className={`${styles.glassButton} ${styles.volumeButton}`}
                aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
              >
                {playerState.isMuted || playerState.volume === 0 ? '🔇' : playerState.volume > 0.5 ? '🔊' : '🔉'}
              </motion.button>

              {/* Compact Volume Slider */}
              <div className={styles.volumeSliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={playerState.volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  aria-label={`Volume: ${Math.round(playerState.volume * 100)}%`}
                />
              </div>
            </div>

            {/* Settings - Collapsed into single menu */}
            <div className={styles.settingsContainer}>
              {/* Quality & Subtitles in single dropdown */}
              {(qualities.length > 1 || subtitles.length > 0) && (
                <select
                  className={`${styles.controlSelect} ${styles.settingsSelect}`}
                  title="Settings"
                  defaultValue=""
                >
                  <option value="" disabled>⚙️ Settings</option>
                  {qualities.length > 1 && (
                    <optgroup label="Quality">
                      {qualities.map(quality => (
                        <option
                          key={quality.id}
                          value={`quality-${quality.id}`}
                          onClick={() => onSelectQuality?.(quality.id)}
                        >
                          {quality.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {subtitles.length > 0 && (
                    <optgroup label="Subtitles">
                      <option
                        value="subtitles-off"
                        onClick={() => onSelectSubtitle?.(null)}
                      >
                        No Subtitles
                      </option>
                      {subtitles.map((subtitle, index) => {
                        const value = typeof subtitle === 'object' ? subtitle.language || subtitle.langcode || subtitle.label || `Subtitle ${index + 1}` : subtitle;
                        const display = typeof subtitle === 'object' ? subtitle.language || subtitle.label || `Subtitle ${index + 1}` : subtitle;
                        return (
                          <option
                            key={index}
                            value={`subtitle-${index}`}
                            onClick={() => onSelectSubtitle?.(subtitle)}
                          >
                            {display}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
              )}

              {/* Episode Carousel Toggle - TV Only */}
              {mediaType === 'tv' && enableAdvanced && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleEpisodeCarousel}
                  className={`${styles.glassButton} ${episodeCarouselVisible ? styles.active : ''}`}
                  aria-label="Episode List"
                >
                  📺
                </motion.button>
              )}

              {/* Progress Actions - Collapsed */}
              {progressData && enableAdvanced && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // Could open a mini menu or use a dropdown
                    onSaveProgress?.();
                  }}
                  className={styles.glassButton}
                  aria-label="Progress Options"
                >
                  💾
                </motion.button>
              )}

              {/* Fullscreen Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleFullscreen}
                className={`${styles.glassButton} ${styles.fullscreenButton}`}
                aria-label={playerState.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {playerState.isFullscreen ? '🗗' : '🗖'}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MediaControls;