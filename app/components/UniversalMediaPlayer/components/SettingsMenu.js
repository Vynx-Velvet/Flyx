import React, { useState, useEffect, useRef } from 'react';
import styles from '../UniversalMediaPlayer.module.css';

const SettingsMenu = ({ qualities, subtitles, onSelectQuality, currentQuality, onSelectSubtitle, activeSubtitle }) => {
  const [qualityOpen, setQualityOpen] = useState(false);
  const [subtitlesOpen, setSubtitlesOpen] = useState(false);
  const [lastSelection, setLastSelection] = useState(null);
  const autoCloseTimer = useRef(null);

  console.log('🎛️ SettingsMenu render:', { 
    activeSubtitle: activeSubtitle?.language,
    activeSubtitleId: activeSubtitle?.id, 
    subtitlesCount: subtitles?.length,
    currentQuality,
    qualitiesCount: qualities?.length
  });

  // Reset auto-close timer on any interaction
  const resetAutoCloseTimer = () => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
    }
    autoCloseTimer.current = setTimeout(() => {
      setQualityOpen(false);
      setSubtitlesOpen(false);
    }, 5000); // 5 seconds
  };

  // Start timer when menu opens, reset on interactions
  useEffect(() => {
    if (qualityOpen || subtitlesOpen) {
      resetAutoCloseTimer();
    } else {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
      }
    }

    return () => {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
      }
    };
  }, [qualityOpen, subtitlesOpen]);

  const getCurrentQualityLabel = () => {
    if (currentQuality === -1) return 'Auto';
    const quality = qualities?.find(q => q.id === currentQuality);
    return quality?.label || 'Auto';
  };

  const getActiveSubtitleLabel = () => {
    return activeSubtitle?.language || 'Off';
  };

  const handleQualitySelect = (qualityId) => {
    onSelectQuality(qualityId);
    setLastSelection({ type: 'quality', value: qualityId });
    resetAutoCloseTimer(); // Reset timer but keep menu open
    
    // Clear selection feedback after 2 seconds
    setTimeout(() => setLastSelection(null), 2000);
  };

  const handleSubtitleSelect = (subtitle) => {
    console.log('🔥 SUBTITLE CLICKED IN SETTINGS MENU:', {
      subtitle: subtitle,
      subtitleLanguage: subtitle?.language,
      subtitleId: subtitle?.id,
      downloadLink: subtitle?.downloadLink,
      currentActiveSubtitle: activeSubtitle?.language
    });
    
    onSelectSubtitle(subtitle);
    setLastSelection({ type: 'subtitle', value: subtitle?.id || 'off' });
    resetAutoCloseTimer(); // Reset timer but keep menu open
    
    // Clear selection feedback after 2 seconds
    setTimeout(() => setLastSelection(null), 2000);
  };

  const handleHeaderClick = (section) => {
    if (section === 'quality') {
      setQualityOpen(!qualityOpen);
    } else {
      setSubtitlesOpen(!subtitlesOpen);
    }
    resetAutoCloseTimer();
  };

  return (
    <div 
      className={styles.settingsMenu}
      onMouseEnter={resetAutoCloseTimer}
      onMouseMove={resetAutoCloseTimer}
    >
      {qualities && qualities.length > 0 && (
        <div className={styles.settingsSection}>
          <div 
            className={styles.settingsDropdownHeader}
            onClick={() => handleHeaderClick('quality')}
          >
            <span className={styles.settingsTitle}>Quality</span>
            <span className={styles.settingsCurrentValue}>{getCurrentQualityLabel()}</span>
            <span className={styles.settingsArrow}>{qualityOpen ? '▲' : '▼'}</span>
          </div>
          {qualityOpen && (
            <ul className={styles.settingsDropdownList}>
              <li 
                className={`${currentQuality === -1 ? styles.activeOption : ''} ${
                  lastSelection?.type === 'quality' && lastSelection?.value === -1 ? styles.justSelected : ''
                }`}
                onClick={() => handleQualitySelect(-1)}
              >
                Auto {currentQuality === -1 && '✓'}
                {lastSelection?.type === 'quality' && lastSelection?.value === -1 && (
                  <span className={styles.selectionFeedback}>Selected!</span>
                )}
              </li>
              {qualities.map(quality => (
                <li 
                  key={quality.id} 
                  className={`${currentQuality === quality.id ? styles.activeOption : ''} ${
                    lastSelection?.type === 'quality' && lastSelection?.value === quality.id ? styles.justSelected : ''
                  }`}
                  onClick={() => handleQualitySelect(quality.id)}
                >
                  {quality.label} {currentQuality === quality.id && '✓'}
                  {lastSelection?.type === 'quality' && lastSelection?.value === quality.id && (
                    <span className={styles.selectionFeedback}>Selected!</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {subtitles && subtitles.length > 0 && (
        <div className={styles.settingsSection}>
          <div 
            className={styles.settingsDropdownHeader}
            onClick={() => handleHeaderClick('subtitles')}
          >
            <span className={styles.settingsTitle}>Subtitles</span>
            <span className={styles.settingsCurrentValue}>{getActiveSubtitleLabel()}</span>
            <span className={styles.settingsArrow}>{subtitlesOpen ? '▲' : '▼'}</span>
          </div>
          {subtitlesOpen && (
            <ul className={styles.settingsDropdownList}>
              <li 
                className={`${!activeSubtitle ? styles.activeOption : ''} ${
                  lastSelection?.type === 'subtitle' && lastSelection?.value === 'off' ? styles.justSelected : ''
                }`}
                onClick={() => handleSubtitleSelect(null)}
              >
                Off {!activeSubtitle && '✓'}
                {lastSelection?.type === 'subtitle' && lastSelection?.value === 'off' && (
                  <span className={styles.selectionFeedback}>Selected!</span>
                )}
              </li>
              {subtitles.map(sub => (
                <li 
                  key={sub.id} 
                  className={`${activeSubtitle?.id === sub.id ? styles.activeOption : ''} ${
                    lastSelection?.type === 'subtitle' && lastSelection?.value === sub.id ? styles.justSelected : ''
                  }`}
                  onClick={() => handleSubtitleSelect(sub)}
                >
                  {sub.language} {activeSubtitle?.id === sub.id && '✓'}
                  {lastSelection?.type === 'subtitle' && lastSelection?.value === sub.id && (
                    <span className={styles.selectionFeedback}>Selected!</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsMenu; 