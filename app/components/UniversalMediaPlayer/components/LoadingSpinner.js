import React, { useEffect, useState } from 'react';
import styles from '../UniversalMediaPlayer.module.css';

const LoadingSpinner = ({ progress, phase }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [particles, setParticles] = useState([]);

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Generate floating particles
  useEffect(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 0.2,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.6 + 0.4,
    }));
    setParticles(newParticles);
  }, []);

  const circumference = 2 * Math.PI * 90; // radius = 90
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <div className={styles.futuristicLoadingContainer}>
      {/* Background overlay with animated gradient */}
      <div className={styles.loadingBackdrop}></div>
      
      {/* Floating particles */}
      <div className={styles.particleField}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={styles.particle}
            style={{
              '--delay': `${particle.delay}s`,
              '--size': `${particle.size}px`,
              '--opacity': particle.opacity,
            }}
          ></div>
        ))}
      </div>

      {/* Main loading content */}
      <div className={styles.loadingContent}>
        {/* Outer glow ring */}
        <div className={styles.outerGlow}></div>
        
        {/* Progress circle container */}
        <div className={styles.progressContainer}>
          {/* Background circle */}
          <svg className={styles.progressSvg} viewBox="0 0 200 200">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle
              className={styles.progressBackground}
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="3"
            />
            {/* Progress circle */}
            <circle
              className={styles.progressCircle}
              cx="100"
              cy="100"
              r="90"
              fill="none"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
              filter="url(#glow)"
            />
          </svg>
          
          {/* Inner content */}
          <div className={styles.progressInner}>
            {/* Central progress display */}
            <div className={styles.progressDisplay}>
              <div className={styles.progressNumber}>{Math.round(animatedProgress)}</div>
              <div className={styles.progressPercent}>%</div>
            </div>
            
            {/* Phase indicator */}
            <div className={styles.phaseIndicator}>
              <div className={styles.phaseText}>{phase}</div>
              <div className={styles.phaseDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading bars animation */}
        <div className={styles.loadingBars}>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={styles.loadingBar}
              style={{ '--delay': `${i * 0.1}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 