import React, { useState, useRef, useEffect } from 'react';
import styles from '../UniversalMediaPlayer.module.css';
import { useTimelinePreview } from '../hooks/useTimelinePreview';
import TimelinePreview from './TimelinePreview';

const PlayerControls = ({
  playerState,
  playerActions,
  onSeek,
  onToggleFullscreen,
  qualities,
  onSelectQuality,
  currentQuality,
  subtitles,
  onSelectSubtitle,
  activeSubtitle,
  videoRef
}) => {
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const volumeSliderRef = useRef(null);
  const timelineRef = useRef(null);
  const lastSeekTimeRef = useRef(0);

  // Timeline preview functionality
  const {
    handleTimelineHover,
    handleTimelineLeave,
    previewVisible,
    previewTime,
    previewPosition,
    thumbnailUrl,
    canvasRef
  } = useTimelinePreview({
    duration: playerState.duration,
    videoRef
  });
  
  const calculateTimeFromEvent = (e) => {
    if (!timelineRef.current) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    return progress * playerState.duration;
  };

  const performSeek = (newTime) => {
    const now = Date.now();
    // Throttle seeks during dragging to every 100ms
    if (isDraggingTimeline && now - lastSeekTimeRef.current < 100) {
      return;
    }
    
    lastSeekTimeRef.current = now;
    if (isFinite(newTime) && newTime >= 0) {
      onSeek(newTime);
    }
  };

  const handleTimelineMouseDown = (e) => {
    if (playerState.isSeeking) return;
    
    e.preventDefault();
    setIsDraggingTimeline(true);
    
    const newTime = calculateTimeFromEvent(e);
    performSeek(newTime);
    
    console.log('🎯 Timeline drag started:', { newTime });
  };

  const handleTimelineMouseMove = (e) => {
    if (!isDraggingTimeline || playerState.isSeeking) return;
    
    const newTime = calculateTimeFromEvent(e);
    performSeek(newTime);
  };

  const handleTimelineMouseUp = () => {
    if (isDraggingTimeline) {
      setIsDraggingTimeline(false);
      console.log('🎯 Timeline drag ended');
    }
  };
  
  const handleProgressClick = (e) => {
    // Don't handle click if we're dragging or seeking
    if (isDraggingTimeline || playerState.isSeeking) return;
    
    const newTime = calculateTimeFromEvent(e);
    
    console.log('🎯 Timeline click:', { 
      newTime, 
      duration: playerState.duration,
      currentTime: playerState.currentTime 
    });
    
    if (isFinite(newTime) && newTime >= 0) {
      onSeek(newTime);
    }
  };

  const calculateVolumeFromEvent = (e) => {
    if (!volumeSliderRef.current) return 0;
    
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    return progress;
  };

  const handleVolumeMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingVolume(true);
    
    const newVolume = calculateVolumeFromEvent(e);
    playerActions.setVolume(newVolume);
    
    console.log('🔊 Volume drag started:', { newVolume });
  };

  const handleVolumeMouseMove = (e) => {
    if (!isDraggingVolume) return;
    
    const newVolume = calculateVolumeFromEvent(e);
    playerActions.setVolume(newVolume);
    
    console.log('🔊 Volume dragging:', { newVolume });
  };

  const handleVolumeMouseUp = () => {
    if (isDraggingVolume) {
      setIsDraggingVolume(false);
      console.log('🔊 Volume drag ended');
    }
  };

  // Global mouse events for dragging
  useEffect(() => {
    if (isDraggingVolume || isDraggingTimeline) {
      const handleMouseMove = (e) => {
        handleVolumeMouseMove(e);
        handleTimelineMouseMove(e);
      };
      const handleMouseUp = () => {
        handleVolumeMouseUp();
        handleTimelineMouseUp();
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDraggingVolume, isDraggingTimeline]);

  const handleVolumeClick = (e) => {
    // Only handle click if not dragging
    if (isDraggingVolume) return;
    
    const newVolume = calculateVolumeFromEvent(e);
    playerActions.setVolume(newVolume);
    
    console.log('🔊 Volume click:', { newVolume });
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (playerState.isMuted || playerState.volume === 0) return '🔇';
    if (playerState.volume <= 0.3) return '🔈';
    if (playerState.volume <= 0.7) return '🔉';
    return '🔊';
  };

  // Show previous volume when muted so user can see what they'll return to
  const displayVolume = playerState.isMuted ? 
    (playerState.previousVolume || 0) : 
    playerState.volume;

  return (
    <div>
      {/* Hidden canvas for thumbnail generation */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
        width="160" 
        height="90"
      />

      {/* Timeline */}
      <div 
        ref={timelineRef}
        className={`${styles.timeline} ${playerState.isSeeking ? styles.timelineSeeking : ''} ${isDraggingTimeline ? styles.timelineDragging : ''}`}
        onClick={handleProgressClick}
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={(e) => !isDraggingTimeline && handleTimelineHover(e, timelineRef.current)}
        onMouseLeave={handleTimelineLeave}
        style={{ 
          cursor: playerState.isSeeking ? 'wait' : (isDraggingTimeline ? 'grabbing' : 'pointer'),
          opacity: playerState.isSeeking ? 0.7 : 1 
        }}
      >
        {/* Timeline Preview */}
        <TimelinePreview
          visible={previewVisible && !isDraggingTimeline && !playerState.isSeeking}
          position={previewPosition}
          time={previewTime}
          thumbnailUrl={thumbnailUrl}
        />
        {/* Buffered Progress */}
        {playerState.buffered > 0 && (
          <div
            className={styles.timelineBuffered}
            style={{
              width: `${(playerState.buffered / playerState.duration) * 100}%`
            }}
          />
        )}
        
        {/* Current Progress */}
        <div
          className={styles.timelineProgress}
          style={{
            width: `${(playerState.currentTime / playerState.duration) * 100}%`
          }}
        />
      </div>

      {/* Controls Row */}
      <div className={styles.controlsRow}>
        
        {/* Left Controls */}
        <div className={styles.leftControls}>
          
          {/* Play/Pause Button */}
          <button
            onClick={() => playerActions.togglePlay()}
            className={styles.playButton}
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? '⏸️' : '▶️'}
          </button>

          {/* Volume Controls - COMPLETELY REBUILT */}
          <div className={styles.volumeContainer}>
            <button
              onClick={() => playerActions.toggleMute()}
              className={styles.volumeButton}
              aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            
            {/* Custom Volume Slider with Drag Support */}
            <div 
              ref={volumeSliderRef}
              className={`${styles.customVolumeSlider} ${playerState.isMuted ? styles.volumeMuted : ''} ${isDraggingVolume ? styles.volumeDragging : ''}`} 
              onClick={handleVolumeClick}
              onMouseDown={handleVolumeMouseDown}
            >
              {/* Background Track */}
              <div className={styles.volumeTrack}></div>
              
              {/* Volume Fill */}
              <div 
                className={styles.volumeFill} 
                style={{ width: `${displayVolume * 100}%` }}
              ></div>
              
              {/* Volume Thumb */}
              <div 
                className={styles.volumeThumb} 
                style={{ left: `${displayVolume * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Time Display */}
          <div className={styles.timeDisplay}>
            {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
          </div>
        </div>

        {/* Right Controls */}
        <div className={styles.rightControls}>
          
          {/* Quality Selector */}
          {qualities && qualities.length > 0 && (
            <select
              value={currentQuality || '0'}
              onChange={(e) => {
                const selectedValue = e.target.value;
                console.log('🎬 Quality selector changed to:', selectedValue);
                onSelectQuality(selectedValue);
              }}
              className={styles.controlSelect}
              aria-label="Video Quality"
            >
              {qualities.map((quality, index) => (
                <option key={quality.id} value={quality.id.toString()}>
                  {quality.height ? `${quality.height}p` : quality.label || `Quality ${index + 1}`}
                  {quality.bitrate && quality.height ? ` (${Math.round(quality.bitrate / 1000)}k)` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Subtitle Selector */}
          <select
            value={activeSubtitle?.id || ''}
            onChange={(e) => {
              const selected = subtitles.find(sub => sub.id === e.target.value);
              console.log('🎬 Selecting subtitle:', selected);
              onSelectSubtitle(selected || null);
            }}
            className={styles.controlSelect}
            aria-label="Subtitles"
          >
            <option value="">No Subtitles</option>
            {subtitles.map((subtitle, index) => (
              <option key={subtitle.id || index} value={subtitle.id}>
                {subtitle.language || `Subtitle ${index + 1}`}
              </option>
            ))}
          </select>

          {/* Fullscreen Button */}
          <button
            onClick={() => onToggleFullscreen()}
            className={styles.fullscreenButton}
            aria-label={playerState.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {playerState.isFullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls; 