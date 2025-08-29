import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WatchProgressIndicator from './WatchProgressIndicator';

/**
 * ResumeDialog Component
 * 
 * Dialog for resuming or restarting content playback with:
 * - Visual progress indication
 * - Resume/restart options
 * - Auto-dismiss countdown
 * - Accessible keyboard navigation
 * - Consistent futuristic theming
 */
const ResumeDialog = ({
  isVisible = false,
  onResume = null,
  onRestart = null,
  onDismiss = null,
  progressData = null,
  autoResume = false,
  autoResumeDelay = 10, // seconds
  theme = 'dark',
  title = null,
  subtitle = null,
  animate = true
}) => {
  const [countdown, setCountdown] = React.useState(autoResumeDelay);
  const countdownRef = React.useRef(null);

  // Format time for display
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes < 60) return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Auto-resume countdown
  React.useEffect(() => {
    if (!isVisible || !autoResume) return;

    setCountdown(autoResumeDelay);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onResume?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    countdownRef.current = interval;

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isVisible, autoResume, autoResumeDelay, onResume]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isVisible) return;

    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          onResume?.();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onRestart?.();
          break;
        case 'Escape':
          e.preventDefault();
          onDismiss?.();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, onResume, onRestart, onDismiss]);

  if (!isVisible || !progressData) return null;

  const currentTime = progressData.currentTime || 0;
  const duration = progressData.duration || 1;
  const progress = progressData.progress || 0;
  const progressPercentage = Math.round(progress * 100);

  // Dialog styles
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const dialogStyle = {
    background: theme === 'dark' 
      ? 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
    border: theme === 'dark' 
      ? '1px solid rgba(0, 245, 255, 0.3)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '20px',
    padding: '32px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: theme === 'dark'
      ? '0 20px 60px rgba(0, 245, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      : '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    color: theme === 'dark' ? '#ffffff' : '#000000',
    textAlign: 'center'
  };

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    minWidth: '120px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #00f5ff 0%, #0094ff 100%)',
    color: '#000000',
    boxShadow: '0 4px 20px rgba(0, 245, 255, 0.3)'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: 'rgba(255, 255, 255, 0.1)',
    color: theme === 'dark' ? '#ffffff' : '#000000',
    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: animate ? 0.3 : 0 }}
          style={overlayStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onDismiss?.();
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ duration: animate ? 0.4 : 0, ease: "easeOut" }}
            style={dialogStyle}
          >
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: animate ? 0.1 : 0 }}
              >
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  margin: '0 0 8px 0',
                  background: 'linear-gradient(135deg, #00f5ff 0%, #ffffff 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
                }}>
                  {title || 'Resume Watching?'}
                </h2>
                {subtitle && (
                  <p style={{ 
                    fontSize: '16px', 
                    opacity: 0.8, 
                    margin: '0',
                    fontWeight: '400'
                  }}>
                    {subtitle}
                  </p>
                )}
              </motion.div>
            </div>

            {/* Progress Section */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: animate ? 0.2 : 0 }}
              style={{ marginBottom: '32px' }}
            >
              <div style={{
                background: theme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${theme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)'}`,
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <WatchProgressIndicator
                    progress={progress}
                    isCompleted={progressData.isCompleted}
                    isStarted={progressData.isStarted}
                    mode="bar"
                    size="large"
                    animate={animate}
                    theme={theme}
                  />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  opacity: 0.8,
                  fontWeight: '500'
                }}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{progressPercentage}% complete</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {progressData.lastWatched && (
                <p style={{ 
                  fontSize: '12px', 
                  opacity: 0.6, 
                  margin: '0',
                  fontStyle: 'italic'
                }}>
                  Last watched {new Date(progressData.lastWatched).toLocaleDateString()}
                </p>
              )}
            </motion.div>

            {/* Auto-resume countdown */}
            {autoResume && countdown > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: animate ? 0.3 : 0 }}
                style={{
                  marginBottom: '24px',
                  padding: '12px 16px',
                  background: 'rgba(0, 245, 255, 0.1)',
                  border: '1px solid rgba(0, 245, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#00f5ff'
                }}
              >
                Auto-resuming in {countdown} second{countdown !== 1 ? 's' : ''}...
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: animate ? 0.4 : 0 }}
              style={{ 
                display: 'flex', 
                gap: '16px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              <button
                onClick={() => {
                  if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                  }
                  onResume?.();
                }}
                style={primaryButtonStyle}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 25px rgba(0, 245, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 20px rgba(0, 245, 255, 0.3)';
                }}
                autoFocus
              >
                ▶ Resume ({formatTime(currentTime)})
              </button>

              <button
                onClick={() => {
                  if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                  }
                  onRestart?.();
                }}
                style={secondaryButtonStyle}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.background = theme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.background = theme === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)';
                }}
              >
                🔄 Start Over
              </button>
            </motion.div>

            {/* Keyboard shortcuts hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animate ? 0.6 : 0 }}
              style={{
                marginTop: '24px',
                fontSize: '11px',
                opacity: 0.5,
                lineHeight: 1.4
              }}
            >
              <div>Press <strong>Enter</strong> to resume, <strong>R</strong> to restart, or <strong>Esc</strong> to cancel</div>
            </motion.div>

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animate ? 0.5 : 0 }}
              onClick={() => {
                if (countdownRef.current) {
                  clearInterval(countdownRef.current);
                }
                onDismiss?.();
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = theme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)';
                e.target.style.color = theme === 'dark' ? '#ffffff' : '#000000';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = theme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.6)'
                  : 'rgba(0, 0, 0, 0.6)';
              }}
              title="Close (Esc)"
            >
              ✕
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResumeDialog;