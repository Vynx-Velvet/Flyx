import React from 'react';
import styles from '../UniversalMediaPlayer.module.css';

const EpisodeNavigation = ({
  hasNextEpisode,
  hasPreviousEpisode,
  onNextEpisode,
  onPreviousEpisode,
  getCurrentEpisode,
  getNextEpisode,
  getPreviousEpisode,
  loading
}) => {
  const currentEpisode = getCurrentEpisode();
  const nextEpisode = getNextEpisode();
  const previousEpisode = getPreviousEpisode();

  if (loading || !currentEpisode) {
    return null;
  }

  return (
    <div className={styles.episodeNavigation}>
      {/* Previous Episode Button */}
      <button
        onClick={onPreviousEpisode}
        disabled={!hasPreviousEpisode || loading}
        className={`${styles.episodeNavButton} ${styles.previousEpisode}`}
        title={previousEpisode ? `Previous: E${previousEpisode.episodeNumber} - ${previousEpisode.name}` : 'No previous episode'}
      >
        <span className={styles.episodeNavIcon}>⏮️</span>
        <div className={styles.episodeNavText}>
          <span className={styles.episodeNavLabel}>Previous</span>
          {previousEpisode && (
            <span className={styles.episodeNavTitle}>
              E{previousEpisode.episodeNumber}
            </span>
          )}
        </div>
      </button>

      {/* Current Episode Info */}
      <div className={styles.currentEpisodeInfo}>
        <span className={styles.currentEpisodeNumber}>E{currentEpisode.episodeNumber}</span>
        <span className={styles.currentEpisodeName}>{currentEpisode.name}</span>
      </div>

      {/* Next Episode Button */}
      <button
        onClick={onNextEpisode}
        disabled={!hasNextEpisode || loading}
        className={`${styles.episodeNavButton} ${styles.nextEpisode}`}
        title={nextEpisode ? `Next: E${nextEpisode.episodeNumber} - ${nextEpisode.name}` : 'No next episode'}
      >
        <div className={styles.episodeNavText}>
          <span className={styles.episodeNavLabel}>Next</span>
          {nextEpisode && (
            <span className={styles.episodeNavTitle}>
              E{nextEpisode.episodeNumber}
            </span>
          )}
        </div>
        <span className={styles.episodeNavIcon}>⏭️</span>
      </button>
    </div>
  );
};

export default EpisodeNavigation;