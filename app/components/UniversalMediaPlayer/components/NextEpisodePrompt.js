import React from 'react';
import styles from '../UniversalMediaPlayer.module.css';

const NextEpisodePrompt = ({
  show,
  countdown,
  nextEpisode,
  onNext,
  onDismiss
}) => {
  console.log('🎬 NextEpisodePrompt render:', { show, nextEpisode, countdown });
  
  if (!show) {
    console.log('🎬 NextEpisodePrompt: Not showing (show=false)');
    return null;
  }
  
  console.log('🎬 NextEpisodePrompt: RENDERING!');
  
  // Use fallback data if nextEpisode is missing
  const episodeData = nextEpisode || {
    episodeNumber: 'Next',
    name: 'Next Episode',
    overview: 'Continue watching...'
  };

  return (
    <div className={styles.nextEpisodePrompt}>
      <div className={styles.promptContent}>
        <div className={styles.promptHeader}>
          <h3>Up Next</h3>
          <button 
            className={styles.promptCloseButton}
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        
        <div className={styles.promptBody}>
          <div className={styles.nextEpisodeInfo}>
            <div className={styles.episodeNumber}>
              Episode {episodeData.episodeNumber}
            </div>
            <div className={styles.episodeTitle}>
              {episodeData.name}
            </div>
            {episodeData.overview && (
              <div className={styles.episodeOverview}>
                {episodeData.overview.length > 100 
                  ? `${episodeData.overview.substring(0, 100)}...`
                  : episodeData.overview
                }
              </div>
            )}
          </div>
          
          <div className={styles.promptActions}>
            <button 
              className={styles.playNextButton}
              onClick={onNext}
            >
              <span className={styles.playIcon}>▶️</span>
              Play Now
            </button>
            
            <div className={styles.autoAdvanceInfo}>
              Auto-play in {countdown}s
            </div>
          </div>
        </div>
        
        <div className={styles.promptProgress}>
          <div 
            className={styles.progressBar}
            style={{ 
              width: `${((10 - countdown) / 10) * 100}%`,
              transition: 'width 1s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NextEpisodePrompt;