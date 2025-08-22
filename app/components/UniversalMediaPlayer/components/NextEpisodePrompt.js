import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * NextEpisodePrompt - Advanced auto-advance prompt for TV shows
 * 
 * Features:
 * - Animated countdown with visual indicators
 * - Next episode preview with metadata
 * - Smart positioning and glassmorphism design
 * - User preference learning integration
 * - Accessibility support
 */
const NextEpisodePrompt = ({
  show = false,
  countdown = 10,
  nextEpisode = null,
  onNext,
  onDismiss,
  theme = 'dark',
  enhanced = true
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [animationPhase, setAnimationPhase] = useState('entering');

  // Manage visibility state
  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setAnimationPhase('entering');
      
      // Auto-transition to active phase
      const timer = setTimeout(() => {
        setAnimationPhase('active');
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setAnimationPhase('exiting');
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [show]);

  // Format time display
  const formatTime = (seconds) => {
    return seconds > 0 ? `${seconds}s` : 'Now';
  };

  // Calculate countdown percentage for visual indicator
  const countdownPercentage = Math.max(0, (countdown / 10) * 100);

  if (!isVisible || !nextEpisode) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ 
            duration: 0.4, 
            ease: [0.4, 0, 0.2, 1],
            type: "spring",
            stiffness: 100
          }}
          className={`${styles.nextEpisodePrompt} ${styles[`theme-${theme}`]} ${
            enhanced ? styles.enhanced : ''
          }`}
        >
          {/* Background blur overlay */}
          <div className={styles.promptBackdrop} />

          {/* Main content container */}
          <div className={styles.promptContainer}>
            {/* Countdown indicator */}
            <div className={styles.countdownSection}>
              <div className={styles.countdownCircle}>
                <motion.div
                  className={styles.countdownProgress}
                  initial={{ strokeDasharray: "0 283" }}
                  animate={{ 
                    strokeDasharray: `${(countdownPercentage / 100) * 283} 283`,
                    rotate: -90 
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
                <div className={styles.countdownText}>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className={styles.countdownNumber}
                  >
                    {countdown}
                  </motion.span>
                </div>
              </div>
              
              <div className={styles.countdownLabel}>
                Next episode in {formatTime(countdown)}
              </div>
            </div>

            {/* Episode preview */}
            <div className={styles.episodePreview}>
              {/* Episode thumbnail */}
              <div className={styles.episodeThumbnail}>
                {nextEpisode.thumbnail ? (
                  <img 
                    src={nextEpisode.thumbnail} 
                    alt={`${nextEpisode.title} thumbnail`}
                    className={styles.thumbnailImage}
                  />
                ) : (
                  <div className={styles.placeholderThumbnail}>
                    <motion.div
                      className={styles.playIcon}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ▶
                    </motion.div>
                  </div>
                )}
                
                {/* Episode overlay info */}
                <div className={styles.thumbnailOverlay}>
                  <div className={styles.episodeNumber}>
                    S{nextEpisode.seasonNumber}E{nextEpisode.episodeNumber}
                  </div>
                  {nextEpisode.duration && (
                    <div className={styles.episodeDuration}>
                      {Math.round(nextEpisode.duration / 60)}min
                    </div>
                  )}
                </div>
              </div>

              {/* Episode metadata */}
              <div className={styles.episodeInfo}>
                <h3 className={styles.episodeTitle}>
                  {nextEpisode.title}
                </h3>
                
                {nextEpisode.description && (
                  <p className={styles.episodeDescription}>
                    {nextEpisode.description.length > 120 
                      ? `${nextEpisode.description.substring(0, 120)}...`
                      : nextEpisode.description
                    }
                  </p>
                )}

                {/* Additional metadata */}
                <div className={styles.episodeMeta}>
                  {nextEpisode.rating && (
                    <div className={styles.rating}>
                      ⭐ {nextEpisode.rating.toFixed(1)}
                    </div>
                  )}
                  {nextEpisode.airDate && (
                    <div className={styles.airDate}>
                      {new Date(nextEpisode.airDate).getFullYear()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className={styles.promptActions}>
              <motion.button
                onClick={onDismiss}
                className={`${styles.promptButton} ${styles.dismissButton}`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <span className={styles.buttonIcon}>✕</span>
                Cancel
              </motion.button>

              <motion.button
                onClick={onNext}
                className={`${styles.promptButton} ${styles.playNextButton}`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <span className={styles.buttonIcon}>▶</span>
                Play Now
              </motion.button>
            </div>

            {/* Progress indicators */}
            {enhanced && (
              <div className={styles.promptIndicators}>
                <div className={styles.autoPlayIndicator}>
                  <motion.div
                    className={styles.autoPlayProgress}
                    initial={{ width: "100%" }}
                    animate={{ width: `${countdownPercentage}%` }}
                    transition={{ duration: 0.3, ease: "linear" }}
                  />
                </div>
                <div className={styles.indicatorText}>
                  Auto-play enabled
                </div>
              </div>
            )}
          </div>

          {/* Ambient effects for enhanced mode */}
          {enhanced && (
            <div className={styles.promptAmbient}>
              <motion.div
                className={styles.ambientGlow}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// CSS-in-JS styles for the component (to be added to the main CSS file)
const componentStyles = `
.nextEpisodePrompt {
  position: fixed;
  bottom: 100px;
  right: 40px;
  z-index: var(--z-modal);
  max-width: 400px;
  min-width: 350px;
}

.promptBackdrop {
  position: absolute;
  inset: -20px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-large);
}

.promptContainer {
  position: relative;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.countdownSection {
  display: flex;
  align-items: center;
  gap: 16px;
}

.countdownCircle {
  position: relative;
  width: 60px;
  height: 60px;
}

.countdownProgress {
  position: absolute;
  inset: 0;
  fill: none;
  stroke: var(--neon-cyan);
  stroke-width: 3;
  stroke-linecap: round;
  filter: drop-shadow(0 0 8px currentColor);
}

.countdownText {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdownNumber {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--neon-cyan);
  text-shadow: 0 0 8px currentColor;
}

.countdownLabel {
  flex: 1;
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
}

.episodePreview {
  display: flex;
  gap: 16px;
}

.episodeThumbnail {
  position: relative;
  width: 120px;
  height: 68px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-tertiary);
}

.thumbnailImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholderThumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--neon-purple) 0%, var(--neon-cyan) 100%);
}

.playIcon {
  font-size: 2rem;
  color: white;
  cursor: pointer;
}

.thumbnailOverlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
}

.episodeNumber,
.episodeDuration {
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.episodeInfo {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.episodeTitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.episodeDescription {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.episodeMeta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.promptActions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.promptButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
  backdrop-filter: blur(8px);
}

.dismissButton {
  background: rgba(255,255,255,0.1);
  color: var(--text-secondary);
  border: 1px solid rgba(255,255,255,0.2);
}

.dismissButton:hover {
  background: rgba(255,255,255,0.15);
  color: var(--text-primary);
}

.playNextButton {
  background: linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(0,245,255,0.3);
}

.playNextButton:hover {
  box-shadow: 0 6px 20px rgba(0,245,255,0.4);
  filter: brightness(1.1);
}

.buttonIcon {
  font-size: 0.9rem;
}

.promptIndicators {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.autoPlayIndicator {
  height: 2px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.autoPlayProgress {
  height: 100%;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple));
  box-shadow: 0 0 8px currentColor;
}

.indicatorText {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}

.promptAmbient {
  position: absolute;
  inset: -30px;
  pointer-events: none;
  z-index: -1;
}

.ambientGlow {
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, var(--neon-cyan) 0%, transparent 70%);
  opacity: 0.3;
  filter: blur(20px);
}

/* Theme variations */
.nextEpisodePrompt.theme-light .promptBackdrop {
  background: rgba(255,255,255,0.9);
  border-color: rgba(0,0,0,0.1);
}

.nextEpisodePrompt.theme-light .countdownNumber {
  color: var(--neon-purple);
}

/* Enhanced mode */
.nextEpisodePrompt.enhanced {
  animation: subtleFloat 6s ease-in-out infinite;
}

@keyframes subtleFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

/* Responsive design */
@media (max-width: 768px) {
  .nextEpisodePrompt {
    bottom: 120px;
    right: 20px;
    left: 20px;
    max-width: none;
    min-width: 0;
  }
  
  .promptContainer {
    padding: 20px;
  }
  
  .episodePreview {
    flex-direction: column;
    gap: 12px;
  }
  
  .episodeThumbnail {
    width: 100%;
    height: 140px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .nextEpisodePrompt.enhanced {
    animation: none;
  }
  
  .ambientGlow {
    animation: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .promptBackdrop {
    background: var(--bg-primary);
    border-color: var(--text-primary);
  }
  
  .promptButton {
    border: 2px solid currentColor;
  }
}
`;

export default NextEpisodePrompt;