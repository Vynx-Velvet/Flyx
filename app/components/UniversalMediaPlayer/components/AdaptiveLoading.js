import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * AdaptiveLoading - Advanced loading screen with particle effects and dynamic animations
 * 
 * Features:
 * - Adaptive particle system based on device performance
 * - Dynamic loading phases with contextual messaging
 * - Smooth progress animations with physics-based easing
 * - Theme-aware color schemes
 * - Performance-optimized rendering
 * - Accessibility-compliant animations
 */
const AdaptiveLoading = ({
  progress = 0,
  phase = 'Initializing...',
  enableParticles = true,
  theme = 'dark',
  mediaType = 'movie',
  estimatedTime = null,
  debugMode = false
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const [performanceLevel, setPerformanceLevel] = useState('high');
  const [loadingMessages, setLoadingMessages] = useState([]);

  // Smooth progress animation with physics-based easing
  useEffect(() => {
    const duration = 800; // 800ms animation duration
    const startTime = Date.now();
    const startProgress = displayProgress;
    const progressDiff = progress - startProgress;

    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // Cubic easing out for smooth deceleration
      const easedT = 1 - Math.pow(1 - t, 3);
      const newProgress = startProgress + (progressDiff * easedT);
      
      setDisplayProgress(newProgress);
      
      if (t < 1) {
        requestAnimationFrame(animateProgress);
      }
    };
    
    requestAnimationFrame(animateProgress);
  }, [progress]);

  // Performance detection and adaptive settings
  useEffect(() => {
    const detectPerformance = () => {
      // Check hardware acceleration
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const hasWebGL = !!gl;
      
      // Check device memory (if available)
      const deviceMemory = navigator.deviceMemory || 4;
      
      // Check connection speed
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const effectiveType = connection?.effectiveType || '4g';
      
      // Determine performance level
      if (!hasWebGL || deviceMemory < 2 || effectiveType === 'slow-2g' || effectiveType === '2g') {
        setPerformanceLevel('low');
      } else if (deviceMemory < 4 || effectiveType === '3g') {
        setPerformanceLevel('medium');
      } else {
        setPerformanceLevel('high');
      }
      
      console.log('🚀 Performance level detected:', {
        level: performanceLevel,
        webGL: hasWebGL,
        memory: deviceMemory,
        connection: effectiveType
      });
    };
    
    detectPerformance();
  }, []);

  // Dynamic particle color based on theme and progress
  const getParticleColor = (index, currentTheme) => {
    const colors = {
      dark: ['#00f5ff', '#ff006e', '#8b5cf6', '#00ff88'],
      light: ['#0ea5e9', '#ec4899', '#8b5cf6', '#10b981'],
      neon: ['#00f5ff', '#ff1744', '#e91e63', '#00e676']
    };
    
    const palette = colors[currentTheme] || colors.dark;
    return palette[index % palette.length];
  };

  // Generate adaptive particle system
  const particleConfig = useMemo(() => {
    if (!enableParticles || performanceLevel === 'low') return { count: 0, particles: [] };
    
    const baseConfig = {
      low: { count: 10, updateInterval: 200, size: [2, 4] },
      medium: { count: 25, updateInterval: 100, size: [2, 6] },
      high: { count: 50, updateInterval: 50, size: [1, 8] }
    };
    
    const config = baseConfig[performanceLevel];
    const newParticles = Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (config.size[1] - config.size[0]) + config.size[0],
      opacity: Math.random() * 0.6 + 0.3,
      speed: Math.random() * 2 + 1,
      direction: Math.random() * Math.PI * 2,
      color: getParticleColor(i, theme),
      delay: Math.random() * 3
    }));
    
    return { ...config, particles: newParticles };
  }, [enableParticles, performanceLevel, theme]);

  // Update particles position
  useEffect(() => {
    if (!enableParticles || particleConfig.count === 0) return;
    
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: (particle.x + Math.cos(particle.direction) * particle.speed * 0.5) % 100,
        y: (particle.y + Math.sin(particle.direction) * particle.speed * 0.5) % 100,
        opacity: 0.3 + Math.sin(Date.now() * 0.001 + particle.delay) * 0.3
      })));
    }, particleConfig.updateInterval || 100);
    
    return () => clearInterval(interval);
  }, [enableParticles, particleConfig]);

  // Initialize particles
  useEffect(() => {
    if (particleConfig.particles.length > 0) {
      setParticles(particleConfig.particles);
    }
  }, [particleConfig]);

  // Dynamic loading messages based on progress and phase
  useEffect(() => {
    const messages = {
      'Initializing...': ['Starting media engine...', 'Loading player components...', 'Preparing interface...'],
      'Loading stream...': ['Connecting to servers...', 'Analyzing stream quality...', 'Optimizing playback...'],
      'Processing subtitles...': ['Fetching subtitle data...', 'Processing language files...', 'Optimizing display...'],
      'Buffering...': ['Building buffer cache...', 'Optimizing network...', 'Preparing playback...'],
      'Finalizing...': ['Applying final touches...', 'Starting playback...', 'Ready to play...']
    };
    
    const phaseMessages = messages[phase] || ['Processing...', 'Please wait...', 'Almost ready...'];
    const messageIndex = Math.floor((displayProgress / 100) * phaseMessages.length);
    const currentMessage = phaseMessages[Math.min(messageIndex, phaseMessages.length - 1)];
    
    setLoadingMessages(prev => {
      if (prev[prev.length - 1] !== currentMessage) {
        return [...prev.slice(-2), currentMessage];
      }
      return prev;
    });
  }, [phase, displayProgress]);

  // Calculate estimated time remaining
  const getTimeRemaining = () => {
    if (!estimatedTime || displayProgress === 0) return null;
    
    const remaining = Math.ceil(estimatedTime * (1 - displayProgress / 100));
    if (remaining <= 0) return 'Almost ready...';
    if (remaining === 1) return '1 second remaining';
    return `${remaining} seconds remaining`;
  };

  // Render particle system
  const renderParticles = () => {
    if (!enableParticles || particles.length === 0) return null;
    
    return (
      <div className={styles.loadingParticles}>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className={styles.loadingParticle}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              '--color': particle.color,
              '--delay': `${particle.delay}s`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: particle.opacity,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
            }}
            transition={{ duration: 0.5, delay: particle.delay }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.adaptiveLoading} ${styles[`theme-${theme}`]}`}>
      {/* Dynamic background with performance-aware effects */}
      <div className={styles.loadingBackdrop} />
      
      {/* Particle system */}
      {renderParticles()}
      
      {/* Main loading content */}
      <div className={styles.loadingContent}>
        {/* Central loading orb */}
        <div className={styles.loadingOrb}>
          <div className={styles.loadingRings}>
            <div className={styles.loadingRing} />
            <div className={styles.loadingRing} />
            <div className={styles.loadingRing} />
          </div>
          
          {/* Progress display */}
          <motion.div 
            className={styles.loadingProgress}
            key={Math.floor(displayProgress)}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Math.round(displayProgress)}%
          </motion.div>
        </div>
        
        {/* Phase indicator with animated messages */}
        <div className={styles.phaseIndicator}>
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={styles.phaseText}
            >
              {phase}
            </motion.div>
          </AnimatePresence>
          
          {/* Loading message carousel */}
          <AnimatePresence mode="wait">
            {loadingMessages.length > 0 && (
              <motion.div
                key={loadingMessages[loadingMessages.length - 1]}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={styles.loadingMessage}
              >
                {loadingMessages[loadingMessages.length - 1]}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Time remaining */}
          {estimatedTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={styles.timeRemaining}
            >
              {getTimeRemaining()}
            </motion.div>
          )}
          
          {/* Animated loading dots */}
          <div className={styles.phaseDots}>
            <span style={{ animationDelay: '0s' }} />
            <span style={{ animationDelay: '0.2s' }} />
            <span style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
        
        {/* Performance indicator (debug mode) */}
        {debugMode && (
          <div className={styles.performanceIndicator}>
            <div>Performance: {performanceLevel}</div>
            <div>Particles: {particles.length}</div>
            <div>Theme: {theme}</div>
          </div>
        )}
        
        {/* Loading bars visualization */}
        <div className={styles.loadingBars}>
          {Array.from({ length: 8 }, (_, i) => (
            <motion.div
              key={i}
              className={styles.loadingBar}
              style={{
                '--delay': `${i * 0.1}s`,
                height: `${20 + Math.sin((displayProgress / 100) * Math.PI + i) * 15}px`
              }}
              animate={{
                scaleY: [0.3, 1, 0.3],
                backgroundColor: [
                  getParticleColor(i, theme),
                  getParticleColor((i + 1) % 4, theme),
                  getParticleColor(i, theme)
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Skip button for development */}
      {debugMode && (
        <button
          className={styles.skipButton}
          onClick={() => console.log('Skip loading (debug mode)')}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Skip (Debug)
        </button>
      )}
    </div>
  );
};

export default AdaptiveLoading;