import React, { useState, useRef, useEffect } from 'react';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * Simple, functional media controls that actually work
 */
const SimpleMediaControls = ({
  videoRef,
  playerState,
  playerActions,
  onToggleFullscreen,
  qualities = [],
  onSelectQuality,
  currentQuality = 'auto',
  subtitles = [],
  onSelectSubtitle,
  activeSubtitle = null
}) => {
  // Local state for dragging
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Refs
  const timelineRef = useRef(null);
  const volumeSliderRef = useRef(null);

  // Format time helper
  const formatTime = (seconds) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timeline progress calculation
  const progressPercentage = playerState.duration > 0 
    ? (playerState.currentTime / playerState.duration) * 100 
    : 0;

  // Timeline click handler (not hover!)
  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !videoRef?.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = progress * playerState.duration;
    
    // Actually seek the video
    videoRef.current.currentTime = newTime;
    if (playerActions.seek) {
      playerActions.seek(newTime);
    }
  };

  // Timeline drag handlers
  const handleTimelineMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingTimeline(true);
    handleTimelineClick(e);
  };

  const handleTimelineMouseMove = (e) => {
    if (!isDraggingTimeline) return;
    handleTimelineClick(e);
  };

  const handleTimelineMouseUp = () => {
    setIsDraggingTimeline(false);
  };

  // Volume handlers
  const handleVolumeClick = (e) => {
    if (!volumeSliderRef.current || !videoRef?.current) return;
    
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    
    // Actually set the video volume
    videoRef.current.volume = progress;
    if (playerActions.setVolume) {
      playerActions.setVolume(progress);
    }
  };

  const handleVolumeMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    handleVolumeClick(e);
  };

  const handleVolumeMouseMove = (e) => {
    if (!isDraggingVolume) return;
    handleVolumeClick(e);
  };

  const handleVolumeMouseUp = () => {
    setIsDraggingVolume(false);
  };

  // Play/Pause handler
  const handlePlayPause = () => {
    if (!videoRef?.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
      if (playerActions.setPlaying) {
        playerActions.setPlaying(true);
      }
    } else {
      videoRef.current.pause();
      if (playerActions.setPlaying) {
        playerActions.setPlaying(false);
      }
    }
  };

  // Mute handler
  const handleMute = () => {
    if (!videoRef?.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    if (playerActions.toggleMute) {
      playerActions.toggleMute();
    }
  };

  // Quality change handler
  const handleQualityChange = (e) => {
    const qualityId = e.target.value;
    if (onSelectQuality) {
      onSelectQuality(qualityId);
    }
  };

  // Subtitle change handler
  const handleSubtitleChange = (e) => {
    const subtitleId = e.target.value;
    if (subtitleId === 'none') {
      if (onSelectSubtitle) {
        onSelectSubtitle(null);
      }
    } else {
      const subtitle = subtitles.find(s => s.id === subtitleId);
      if (subtitle && onSelectSubtitle) {
        onSelectSubtitle(subtitle);
      }
    }
  };

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
      if (isDraggingTimeline) {
        handleTimelineMouseUp();
      }
      if (isDraggingVolume) {
        handleVolumeMouseUp();
      }
    };

    if (isDraggingTimeline || isDraggingVolume) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingTimeline, isDraggingVolume]);

  // Volume icon selection
  const getVolumeIcon = () => {
    if (playerState.isMuted || playerState.volume === 0) return '🔇';
    if (playerState.volume <= 0.3) return '🔈';
    if (playerState.volume <= 0.7) return '🔉';
    return '🔊';
  };

  return (
    <div className={styles.controlsContainer}>
      {/* Timeline */}
      <div className={styles.timelineContainer}>
        <div 
          ref={timelineRef}
          className={styles.timeline}
          onMouseDown={handleTimelineMouseDown}
          style={{ cursor: isDraggingTimeline ? 'grabbing' : 'pointer' }}
        >
          {/* Progress bar */}
          <div
            className={styles.timelineProgress}
            style={{ width: `${progressPercentage}%` }}
          >
            <div className={styles.timelineThumb} />
          </div>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className={styles.controlsRow}>
        {/* Left Controls */}
        <div className={styles.leftControls}>
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className={styles.playButton}
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? '⏸️' : '▶️'}
          </button>

          {/* Volume Controls */}
          <div 
            className={styles.volumeContainer}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => !isDraggingVolume && setShowVolumeSlider(false)}
          >
            <button
              onClick={handleMute}
              className={styles.glassButton}
              aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            
            {showVolumeSlider && (
              <div
                ref={volumeSliderRef}
                className={styles.volumeSlider}
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
              </div>
            )}
          </div>

          {/* Time Display */}
          <div className={styles.timeDisplay}>
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </div>
        </div>

        {/* Center Controls */}
        <div className={styles.centerControls}>
          {/* Quality Selector */}
          {qualities.length > 0 && (
            <select 
              value={currentQuality} 
              onChange={handleQualityChange}
              className={styles.glassButton}
              style={{ minWidth: '80px' }}
            >
              {qualities.map((quality) => (
                <option key={quality.id} value={quality.id}>
                  {quality.label}
                </option>
              ))}
            </select>
          )}

          {/* Subtitle Selector */}
          {subtitles.length > 0 && (
            <select 
              value={activeSubtitle?.id || 'none'} 
              onChange={handleSubtitleChange}
              className={styles.glassButton}
              style={{ minWidth: '100px' }}
            >
              <option value="none">No Subtitles</option>
              {subtitles.map((subtitle) => (
                <option key={subtitle.id} value={subtitle.id}>
                  {subtitle.language}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right Controls */}
        <div className={styles.rightControls}>
          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className={styles.glassButton}
            aria-label="Toggle Fullscreen"
          >
            {playerState.isFullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleMediaControls;