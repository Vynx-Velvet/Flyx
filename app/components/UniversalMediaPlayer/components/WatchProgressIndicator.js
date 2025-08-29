import React from 'react';
import { motion } from 'framer-motion';

/**
 * WatchProgressIndicator Component
 * 
 * Visual indicator for watch progress with:
 * - Animated progress bars
 * - Multiple display modes (bar, ring, minimal)
 * - Status indicators (new, in-progress, completed)
 * - Consistent futuristic theming
 * - Responsive sizing
 */
const WatchProgressIndicator = ({
  progress = 0, // 0-1 decimal
  isCompleted = false,
  isStarted = false,
  mode = 'bar', // 'bar', 'ring', 'minimal', 'badge'
  size = 'medium', // 'small', 'medium', 'large'
  showPercentage = false,
  showTimeRemaining = false,
  timeRemaining = 0,
  className = '',
  animate = true,
  theme = 'dark'
}) => {
  // Normalize progress
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const progressPercentage = Math.round(normalizedProgress * 100);

  // Size configurations
  const sizeConfigs = {
    small: {
      height: 4,
      width: '100%',
      ringSize: 24,
      fontSize: '10px',
      padding: '2px 4px'
    },
    medium: {
      height: 6,
      width: '100%',
      ringSize: 32,
      fontSize: '12px',
      padding: '4px 8px'
    },
    large: {
      height: 8,
      width: '100%',
      ringSize: 48,
      fontSize: '14px',
      padding: '6px 12px'
    }
  };

  const config = sizeConfigs[size] || sizeConfigs.medium;

  // Format time remaining
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Status colors
  const getStatusColor = () => {
    if (isCompleted) return '#00ff88'; // Bright green
    if (isStarted) return '#00f5ff'; // Cyan
    return 'rgba(255, 255, 255, 0.3)'; // Gray
  };

  const getBackgroundColor = () => {
    return theme === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)';
  };

  // Bar Mode Component
  const BarMode = () => (
    <div
      className={`watch-progress-bar ${className}`}
      style={{
        position: 'relative',
        width: config.width,
        height: config.height,
        backgroundColor: getBackgroundColor(),
        borderRadius: config.height / 2,
        overflow: 'hidden',
        border: `1px solid ${getBackgroundColor()}`,
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
      }}
      title={`${progressPercentage}% watched${isCompleted ? ' (Completed)' : ''}`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progressPercentage}%` }}
        transition={{ duration: animate ? 0.6 : 0, ease: "easeOut" }}
        style={{
          height: '100%',
          backgroundColor: getStatusColor(),
          borderRadius: config.height / 2,
          boxShadow: `0 0 ${config.height}px ${getStatusColor()}33`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Animated glow effect */}
        {animate && isStarted && (
          <motion.div
            animate={{
              x: ['-100%', '100%'],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
              pointerEvents: 'none'
            }}
          />
        )}
      </motion.div>
      
      {/* Completed checkmark */}
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            right: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#00ff88',
            fontSize: config.fontSize,
            fontWeight: 'bold'
          }}
        >
          ✓
        </div>
      )}
    </div>
  );

  // Ring Mode Component
  const RingMode = () => {
    const radius = (config.ringSize - 4) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${normalizedProgress * circumference} ${circumference}`;

    return (
      <div
        className={`watch-progress-ring ${className}`}
        style={{
          position: 'relative',
          width: config.ringSize,
          height: config.ringSize
        }}
        title={`${progressPercentage}% watched${isCompleted ? ' (Completed)' : ''}`}
      >
        <svg
          width={config.ringSize}
          height={config.ringSize}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background ring */}
          <circle
            cx={config.ringSize / 2}
            cy={config.ringSize / 2}
            r={radius}
            stroke={getBackgroundColor()}
            strokeWidth="2"
            fill="transparent"
          />
          
          {/* Progress ring */}
          <motion.circle
            cx={config.ringSize / 2}
            cy={config.ringSize / 2}
            r={radius}
            stroke={getStatusColor()}
            strokeWidth="2"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ 
              strokeDashoffset: circumference - (normalizedProgress * circumference)
            }}
            transition={{ duration: animate ? 0.8 : 0, ease: "easeOut" }}
          />
        </svg>
        
        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: config.fontSize,
            fontWeight: 'bold',
            color: getStatusColor()
          }}
        >
          {isCompleted ? '✓' : `${progressPercentage}%`}
        </div>
      </div>
    );
  };

  // Minimal Mode Component
  const MinimalMode = () => (
    <div
      className={`watch-progress-minimal ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: config.fontSize,
        color: getStatusColor(),
        fontWeight: '500'
      }}
      title={`${progressPercentage}% watched${isCompleted ? ' (Completed)' : ''}`}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          boxShadow: `0 0 4px ${getStatusColor()}66`,
          opacity: isStarted ? 1 : 0.3
        }}
      />
      {showPercentage && <span>{progressPercentage}%</span>}
      {showTimeRemaining && timeRemaining > 0 && (
        <span style={{ opacity: 0.7 }}>
          {formatTime(timeRemaining)} left
        </span>
      )}
    </div>
  );

  // Badge Mode Component
  const BadgeMode = () => (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: isStarted ? 1 : 0 }}
      transition={{ duration: animate ? 0.3 : 0, ease: "easeOut" }}
      className={`watch-progress-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: config.padding,
        backgroundColor: `${getStatusColor()}20`,
        border: `1px solid ${getStatusColor()}60`,
        borderRadius: '12px',
        fontSize: config.fontSize,
        color: getStatusColor(),
        fontWeight: '600',
        backdropFilter: 'blur(4px)',
        boxShadow: `0 0 8px ${getStatusColor()}33`
      }}
      title={`${progressPercentage}% watched${isCompleted ? ' (Completed)' : ''}`}
    >
      {isCompleted ? (
        <>
          <span>✓</span>
          <span>Completed</span>
        </>
      ) : (
        <>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: getStatusColor()
            }}
          />
          <span>{progressPercentage}%</span>
          {showTimeRemaining && timeRemaining > 0 && (
            <span style={{ opacity: 0.8 }}>
              · {formatTime(timeRemaining)} left
            </span>
          )}
        </>
      )}
    </motion.div>
  );

  // Render based on mode
  switch (mode) {
    case 'ring':
      return <RingMode />;
    case 'minimal':
      return <MinimalMode />;
    case 'badge':
      return <BadgeMode />;
    case 'bar':
    default:
      return <BarMode />;
  }
};

// Convenience wrapper for episode thumbnails
export const EpisodeProgressOverlay = ({ 
  progress, 
  isCompleted, 
  isStarted,
  className = '' 
}) => (
  <div
    className={`episode-progress-overlay ${className}`}
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '4px',
      background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
      zIndex: 2
    }}
  >
    <WatchProgressIndicator
      progress={progress}
      isCompleted={isCompleted}
      isStarted={isStarted}
      mode="bar"
      size="small"
      animate={false}
    />
  </div>
);

// Convenience wrapper for show statistics
export const ShowProgressSummary = ({ 
  totalEpisodes = 0,
  watchedEpisodes = 0,
  completionRate = 0,
  className = '',
  size = 'medium'
}) => (
  <div
    className={`show-progress-summary ${className}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      fontSize: size === 'small' ? '12px' : '14px'
    }}
  >
    <WatchProgressIndicator
      progress={completionRate}
      isCompleted={completionRate >= 1}
      isStarted={completionRate > 0}
      mode="ring"
      size={size}
      animate={true}
    />
    <div>
      <div style={{ fontWeight: '600', color: 'white' }}>
        {watchedEpisodes} / {totalEpisodes} Episodes
      </div>
      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
        {Math.round(completionRate * 100)}% Complete
      </div>
    </div>
  </div>
);

export default WatchProgressIndicator;