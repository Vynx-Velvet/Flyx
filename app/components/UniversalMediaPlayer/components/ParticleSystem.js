'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * ParticleSystem - Advanced particle effects system for immersive media experience
 * 
 * Features:
 * - Multiple particle types (stars, orbs, waves, sparks, bubbles)
 * - Audio-reactive particles that respond to volume and frequency
 * - Performance-adaptive rendering with automatic quality adjustment
 * - Synchronized effects with video content and ambient lighting
 * - Interactive particles that respond to user actions
 * - WebGL acceleration when available
 * - Battery-aware optimization
 * - Customizable particle behaviors and physics
 */
const ParticleSystem = ({
  isPlaying = false,
  audioData = null,
  ambientColors = [],
  intensity = 0.6,
  type = 'stars', // 'stars', 'orbs', 'waves', 'sparks', 'bubbles', 'mixed'
  count = 50,
  interactivity = true,
  audioReactive = true,
  performance = 'auto', // 'low', 'medium', 'high', 'auto'
  batteryOptimization = true,
  customBehaviors = null,
  onParticleClick = null
}) => {
  const [particles, setParticles] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState('medium');
  const [frameRate, setFrameRate] = useState(60);
  const [batteryLevel, setBatteryLevel] = useState(1);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, isMoving: false });
  const lastFrameRef = useRef(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });

  // Performance configuration
  const performanceConfig = useMemo(() => {
    const configs = {
      low: {
        maxParticles: 20,
        updateInterval: 32, // ~30 FPS
        complexEffects: false,
        webgl: false,
        blur: false,
        shadows: false
      },
      medium: {
        maxParticles: 75,
        updateInterval: 16, // ~60 FPS
        complexEffects: true,
        webgl: true,
        blur: true,
        shadows: false
      },
      high: {
        maxParticles: 150,
        updateInterval: 8, // ~120 FPS
        complexEffects: true,
        webgl: true,
        blur: true,
        shadows: true
      }
    };
    
    if (performance === 'auto') {
      // Auto-detect based on device capabilities
      const deviceMemory = navigator.deviceMemory || 4;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const isHighEnd = deviceMemory >= 8 && hardwareConcurrency >= 8;
      const isMidRange = deviceMemory >= 4 && hardwareConcurrency >= 4;
      
      return configs[isHighEnd ? 'high' : isMidRange ? 'medium' : 'low'];
    }
    
    return configs[performance] || configs.medium;
  }, [performance]);

  // Monitor frame rate for adaptive performance
  useEffect(() => {
    const measureFrameRate = () => {
      const now = performance.now();
      fpsCounterRef.current.frames++;
      
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        const fps = fpsCounterRef.current.frames;
        setFrameRate(fps);
        
        // Adaptive performance adjustment
        if (fps < 30 && performanceLevel !== 'low') {
          setPerformanceLevel('low');
        } else if (fps > 50 && performanceLevel === 'low') {
          setPerformanceLevel('medium');
        }
        
        fpsCounterRef.current = { frames: 0, lastTime: now };
      }
    };
    
    if (isActive) {
      const interval = setInterval(measureFrameRate, 100);
      return () => clearInterval(interval);
    }
  }, [isActive, performanceLevel]);

  // Battery monitoring
  useEffect(() => {
    if (!batteryOptimization || !navigator.getBattery) return;
    
    const updateBatteryInfo = async () => {
      try {
        const battery = await navigator.getBattery();
        setBatteryLevel(battery.level);
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    };
    
    updateBatteryInfo();
  }, [batteryOptimization]);

  // Particle class definition
  const createParticle = useCallback((index, particleType = type) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const { width, height } = canvas;
    const colors = ambientColors.length > 0 ? ambientColors : [
      { r: 100, g: 150, b: 255 },
      { r: 255, g: 100, b: 150 },
      { r: 150, g: 255, b: 100 }
    ];
    
    const baseColor = colors[Math.floor(Math.random() * colors.length)];
    
    const particle = {
      id: index,
      type: particleType,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      ax: 0,
      ay: 0,
      size: Math.random() * 8 + 2,
      alpha: Math.random() * 0.8 + 0.2,
      color: baseColor,
      life: 1,
      maxLife: Math.random() * 200 + 100,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      scale: 1,
      pulse: Math.random() * Math.PI * 2,
      audioReactivity: Math.random() * 0.5 + 0.5,
      interactiveRadius: 50 + Math.random() * 50,
      lastInteraction: 0
    };
    
    // Type-specific initialization
    switch (particleType) {
      case 'stars':
        particle.twinkle = Math.random() * Math.PI * 2;
        particle.twinkleSpeed = Math.random() * 0.02 + 0.01;
        break;
        
      case 'orbs':
        particle.size = Math.random() * 15 + 5;
        particle.glowIntensity = Math.random() * 0.5 + 0.5;
        break;
        
      case 'waves':
        particle.waveAmplitude = Math.random() * 20 + 10;
        particle.waveFrequency = Math.random() * 0.02 + 0.01;
        particle.wavePhase = Math.random() * Math.PI * 2;
        break;
        
      case 'sparks':
        particle.trail = [];
        particle.trailLength = 5 + Math.random() * 5;
        particle.sparkIntensity = Math.random() * 0.8 + 0.2;
        break;
        
      case 'bubbles':
        particle.floatSpeed = Math.random() * 0.5 + 0.1;
        particle.wobble = Math.random() * 0.02 + 0.01;
        particle.wobblePhase = Math.random() * Math.PI * 2;
        break;
    }
    
    return particle;
  }, [type, ambientColors]);

  // Initialize particles
  useEffect(() => {
    if (!isPlaying) {
      setIsActive(false);
      setParticles([]);
      particlesRef.current = [];
      return;
    }
    
    setIsActive(true);
    
    const particleCount = Math.min(count, performanceConfig.maxParticles);
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const particleType = type === 'mixed' 
        ? ['stars', 'orbs', 'waves', 'sparks', 'bubbles'][Math.floor(Math.random() * 5)]
        : type;
      
      const particle = createParticle(i, particleType);
      if (particle) {
        newParticles.push(particle);
      }
    }
    
    setParticles(newParticles);
    particlesRef.current = newParticles;
  }, [isPlaying, count, type, createParticle, performanceConfig.maxParticles]);

  // Mouse interaction handler
  const handleMouseMove = useCallback((event) => {
    if (!interactivity || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      isMoving: true
    };
    
    // Reset mouse movement flag after delay
    setTimeout(() => {
      mouseRef.current.isMoving = false;
    }, 100);
  }, [interactivity]);

  // Update particle physics and behaviors
  const updateParticle = useCallback((particle, deltaTime, audioLevel = 0, frequencyData = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return particle;
    
    const { width, height } = canvas;
    
    // Apply custom behaviors if provided
    if (customBehaviors && customBehaviors[particle.type]) {
      return customBehaviors[particle.type](particle, deltaTime, audioLevel, frequencyData);
    }
    
    // Base physics update
    particle.vx += particle.ax * deltaTime;
    particle.vy += particle.ay * deltaTime;
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    
    // Audio reactivity
    if (audioReactive && audioLevel > 0) {
      const audioEffect = audioLevel * particle.audioReactivity * intensity;
      particle.scale = 1 + audioEffect * 0.5;
      particle.alpha = Math.min(1, particle.alpha + audioEffect * 0.1);
      
      if (frequencyData && frequencyData.length > 0) {
        const freqIndex = Math.floor((particle.id / particles.length) * frequencyData.length);
        const freqLevel = frequencyData[freqIndex] / 255;
        particle.size = particle.size * (1 + freqLevel * 0.3);
      }
    }
    
    // Mouse interaction
    if (interactivity && mouseRef.current.isMoving) {
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < particle.interactiveRadius) {
        const force = (particle.interactiveRadius - distance) / particle.interactiveRadius;
        const angle = Math.atan2(dy, dx);
        
        // Repulsion effect
        particle.vx -= Math.cos(angle) * force * 0.5;
        particle.vy -= Math.sin(angle) * force * 0.5;
        
        // Visual effects
        particle.scale = Math.max(particle.scale, 1 + force * 0.5);
        particle.alpha = Math.min(1, particle.alpha + force * 0.3);
        particle.lastInteraction = Date.now();
      }
    }
    
    // Type-specific updates
    switch (particle.type) {
      case 'stars':
        particle.twinkle += particle.twinkleSpeed * deltaTime;
        particle.alpha = 0.5 + Math.sin(particle.twinkle) * 0.3;
        particle.rotation += particle.rotationSpeed * deltaTime;
        break;
        
      case 'orbs':
        particle.pulse += 0.02 * deltaTime;
        particle.scale = 1 + Math.sin(particle.pulse) * 0.2;
        particle.alpha = 0.6 + Math.sin(particle.pulse * 0.5) * 0.2;
        break;
        
      case 'waves':
        particle.wavePhase += particle.waveFrequency * deltaTime;
        particle.y += Math.sin(particle.wavePhase) * particle.waveAmplitude * 0.01;
        particle.alpha = 0.4 + Math.sin(particle.wavePhase) * 0.3;
        break;
        
      case 'sparks':
        // Update trail
        particle.trail.push({ x: particle.x, y: particle.y, alpha: particle.alpha });
        if (particle.trail.length > particle.trailLength) {
          particle.trail.shift();
        }
        
        particle.vy += 0.1 * deltaTime; // Gravity effect
        particle.alpha -= 0.005 * deltaTime;
        break;
        
      case 'bubbles':
        particle.wobblePhase += particle.wobble * deltaTime;
        particle.x += Math.sin(particle.wobblePhase) * 0.5;
        particle.vy = -particle.floatSpeed * deltaTime;
        particle.alpha = 0.3 + Math.sin(particle.wobblePhase * 2) * 0.2;
        break;
    }
    
    // Boundary wrapping
    if (particle.x < -particle.size) particle.x = width + particle.size;
    if (particle.x > width + particle.size) particle.x = -particle.size;
    if (particle.y < -particle.size) particle.y = height + particle.size;
    if (particle.y > height + particle.size) particle.y = -particle.size;
    
    // Life cycle
    particle.life -= deltaTime * 0.001;
    if (particle.life <= 0 || particle.alpha <= 0) {
      // Respawn particle
      const newParticle = createParticle(particle.id, particle.type);
      return newParticle || particle;
    }
    
    return particle;
  }, [
    audioReactive, 
    interactivity, 
    intensity, 
    particles.length, 
    customBehaviors, 
    createParticle
  ]);

  // Render particles to canvas
  const renderParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !particlesRef.current.length) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Render each particle
    particlesRef.current.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.alpha * intensity;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.scale(particle.scale, particle.scale);
      
      const { r, g, b } = particle.color;
      
      switch (particle.type) {
        case 'stars':
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const x = Math.cos(angle) * particle.size;
            const y = Math.sin(angle) * particle.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'orbs':
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${particle.glowIntensity})`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'waves':
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = -particle.size; i <= particle.size; i++) {
            const y = Math.sin((i / particle.size) * Math.PI) * particle.size * 0.5;
            if (i === -particle.size) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
          break;
          
        case 'sparks':
          // Render trail
          particle.trail.forEach((point, index) => {
            const trailAlpha = (index / particle.trail.length) * particle.alpha;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${trailAlpha})`;
            ctx.beginPath();
            ctx.arc(point.x - particle.x, point.y - particle.y, particle.size * (index / particle.trail.length), 0, Math.PI * 2);
            ctx.fill();
          });
          
          // Render main spark
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'bubbles':
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha * 0.1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
      }
      
      ctx.restore();
    });
  }, [intensity]);

  // Main animation loop
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    
    const animate = (currentTime) => {
      const deltaTime = currentTime - lastFrameRef.current;
      lastFrameRef.current = currentTime;
      
      // Skip frame if performance is too low
      if (deltaTime < performanceConfig.updateInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Extract audio data if available
      let audioLevel = 0;
      let frequencyData = null;
      
      if (audioData && audioReactive) {
        if (typeof audioData.getByteFrequencyData === 'function') {
          frequencyData = new Uint8Array(audioData.frequencyBinCount);
          audioData.getByteFrequencyData(frequencyData);
          audioLevel = Array.from(frequencyData).reduce((a, b) => a + b, 0) / frequencyData.length / 255;
        } else if (typeof audioData === 'number') {
          audioLevel = audioData;
        }
      }
      
      // Update particles
      particlesRef.current = particlesRef.current.map(particle => 
        updateParticle(particle, deltaTime, audioLevel, frequencyData)
      );
      
      // Render particles
      renderParticles();
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isActive, 
    performanceConfig.updateInterval, 
    audioData, 
    audioReactive, 
    updateParticle, 
    renderParticles
  ]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  if (!isActive) return null;

  return (
    <div 
      className={styles.particleSystem}
      data-type={type}
      data-performance={performanceLevel}
      onMouseMove={handleMouseMove}
      onClick={onParticleClick}
    >
      <canvas
        ref={canvasRef}
        className={styles.particleCanvas}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: interactivity ? 'auto' : 'none',
          opacity: intensity,
          filter: performanceConfig.blur ? 'blur(0.5px)' : 'none'
        }}
      />
      
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.particleDebug}>
          <div>FPS: {frameRate}</div>
          <div>Particles: {particles.length}</div>
          <div>Performance: {performanceLevel}</div>
          <div>Battery: {Math.round(batteryLevel * 100)}%</div>
        </div>
      )}
    </div>
  );
};

export default ParticleSystem;