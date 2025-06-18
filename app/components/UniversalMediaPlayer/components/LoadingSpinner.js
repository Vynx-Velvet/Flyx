import React from 'react';
import styles from '../UniversalMediaPlayer.module.css';

const LoadingSpinner = ({ progress, phase }) => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <div className={styles.loadingInfo}>
        <div className={styles.loadingPhase}>{phase}</div>
        <div className={styles.loadingProgress}>{progress}%</div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 