import React from 'react';
import styles from '../UniversalMediaPlayer.module.css';

const TimelinePreview = ({
  visible,
  position,
  time,
  thumbnailUrl
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div 
      className={styles.timelinePreview}
      style={{ left: `${position}px` }}
    >
      <div className={styles.previewContent}>
        {/* Show thumbnail only if available, otherwise just show time */}
        {thumbnailUrl ? (
          <div className={styles.previewThumbnail}>
            <img 
              src={thumbnailUrl} 
              alt="Video preview"
              className={styles.thumbnailImage}
            />
          </div>
        ) : (
          <div className={styles.previewTimeOnly}>
            <div className={styles.timeIcon}>🎬</div>
          </div>
        )}
        <div className={styles.previewTime}>
          {time}
        </div>
      </div>
      <div className={styles.previewArrow}></div>
    </div>
  );
};

export default TimelinePreview;