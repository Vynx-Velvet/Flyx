import React, { useState } from 'react';
import styles from '../UniversalMediaPlayer.module.css';
import SettingsMenu from './SettingsMenu';

// A utility to format time from seconds to HH:MM:SS or MM:SS
const formatTime = (timeInSeconds) => {
  const time = Math.round(timeInSeconds);
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  const pad = (num) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};


const PlayerControls = ({ playerState, playerActions, onSeek, qualities, onSelectQuality, currentQuality, subtitles, onSelectSubtitle, activeSubtitle }) => {
  const [showSettings, setShowSettings] = useState(false);
  const {
    isPlaying,
    volume,
    isMuted,
    duration,
    currentTime,
    buffered,
  } = playerState;

  const {
    togglePlay,
    setVolume,
    toggleMute,
  } = playerActions;

  const handleSeek = (e) => {
    const seekTime = (e.nativeEvent.offsetX / e.target.clientWidth) * duration;
    onSeek(seekTime);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  }

  const handleQualitySelect = (qualityId) => {
    console.log('Quality selected:', qualityId);
    onSelectQuality(qualityId);
  };

  const handleSubtitleSelect = (subtitle) => {
    console.log('🔥 SUBTITLE SELECTION IN PLAYERCONTROLS:', {
      subtitle: subtitle,
      subtitleLanguage: subtitle?.language,
      subtitleId: subtitle?.id,
      downloadLink: subtitle?.downloadLink,
      onSelectSubtitleFunction: typeof onSelectSubtitle
    });
    onSelectSubtitle(subtitle);
  };

  return (
    <div className={styles.bottomControls}>
      <div className={styles.timelineContainer} onClick={handleSeek}>
        <div className={styles.timeline}>
          <div className={styles.timelineBuffered} style={{ width: `${(buffered / duration) * 100}%` }} />
          <div className={styles.timelineProgress} style={{ width: `${(currentTime / duration) * 100}%` }} />
        </div>
      </div>
      <div className={styles.controlsRow}>
        <div className={styles.leftControls}>
          <button onClick={togglePlay} className={styles.controlButton}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <div className={styles.volumeContainer}>
            <button onClick={toggleMute} className={styles.controlButton}>
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className={styles.volumeSlider}
            />
          </div>
          <div className={styles.timeDisplay}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        <div className={styles.rightControls}>
          {/* Settings, fullscreen, etc. will go here */}
          <button onClick={toggleSettings} className={styles.controlButton}>⚙️</button>
          {showSettings && (
            <SettingsMenu
              qualities={qualities}
              onSelectQuality={handleQualitySelect}
              currentQuality={currentQuality}
              subtitles={subtitles}
              onSelectSubtitle={handleSubtitleSelect}
              activeSubtitle={activeSubtitle}
            />
          )}
          <button className={styles.controlButton}>⛶</button>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls; 