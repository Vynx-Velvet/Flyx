import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * AmbientLighting - Advanced ambient lighting system synchronized with video content
 * 
 * Features:
 * - Real-time video color analysis
 * - Dynamic lighting effects that respond to scene changes
 * - Multiple lighting modes (Ambilight, Cinema, Party, Focus)
 * - Performance-aware rendering with adaptive quality
 * - Support for custom lighting zones
 * - Color harmony algorithms
 * - Smooth transitions between lighting states
 * - Energy-saving modes for battery optimization
 */
const AmbientLighting = ({
  videoRef,
  isPlaying = false,
  intensity = 0.7,
  mode = 'cinema', // 'ambilight', 'cinema', 'party', 'focus', 'off'
  zones = 12, // Number of lighting zones around the player
  smoothing = 0.8, // Color transition smoothing (0-1)
  performance = 'auto', // 'low', 'medium', 'high', 'auto'
  batteryOptimization = true,
  onColorChange = null,
  customColors = null
}) => {
  const [currentColors, setCurrentColors] = useState([]);
  const [lightingZones, setLightingZones] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState('medium');
  const [batteryLevel, setBatteryLevel] = useState(1);

  const canvasRef = useRef(null);
  const analysisRef = useRef(null);
  const colorHistoryRef = useRef([]);
  const frameCountRef = useRef(0);
  const lastAnalysisRef = useRef(0);

  // Performance configuration based on device capabilities
  const performanceConfig = useMemo(() => {
    const configs = {
      low: {
        analysisWidth: 64,
        analysisHeight: 36,
        updateInterval: 200,
        samplesPerZone: 4,
        colorSampling: 8
      },
      medium: {
        analysisWidth: 96,
        analysisHeight: 54,
        updateInterval: 100,
        samplesPerZone: 9,
        colorSampling: 12
      },
      high: {
        analysisWidth: 128,
        analysisHeight: 72,
        updateInterval: 50,
        samplesPerZone: 16,
        colorSampling: 20
      }
    };
    
    if (performance === 'auto') {
      // Auto-detect performance level based on device capabilities
      const deviceMemory = navigator.deviceMemory || 4;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const isHighEnd = deviceMemory >= 8 && hardwareConcurrency >= 8;
      const isMidRange = deviceMemory >= 4 && hardwareConcurrency >= 4;
      
      return configs[isHighEnd ? 'high' : isMidRange ? 'medium' : 'low'];
    }
    
    return configs[performance] || configs.medium;
  }, [performance]);

  // Monitor battery level for optimization
  useEffect(() => {
    if (!batteryOptimization || !navigator.getBattery) return;
    
    const updateBatteryInfo = async () => {
      try {
        const battery = await navigator.getBattery();
        setBatteryLevel(battery.level);
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(battery.level);
        });
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    };
    
    updateBatteryInfo();
  }, [batteryOptimization]);

  // Adjust performance based on battery level
  useEffect(() => {
    if (!batteryOptimization) return;
    
    if (batteryLevel < 0.2) {
      setPerformanceLevel('low');
    } else if (batteryLevel < 0.5) {
      setPerformanceLevel('medium');
    } else {
      setPerformanceLevel(performance === 'auto' ? 'high' : performance);
    }
  }, [batteryLevel, performance, batteryOptimization]);

  // Initialize lighting zones based on configuration
  useEffect(() => {
    const initializeZones = () => {
      const zoneArray = [];
      const angleStep = (Math.PI * 2) / zones;
      
      for (let i = 0; i < zones; i++) {
        const angle = i * angleStep;
        zoneArray.push({
          id: i,
          angle,
          x: Math.cos(angle),
          y: Math.sin(angle),
          color: { r: 0, g: 0, b: 0 },
          brightness: 0,
          lastUpdate: 0
        });
      }
      
      setLightingZones(zoneArray);
    };
    
    initializeZones();
  }, [zones]);

  // Color analysis function
  const analyzeVideoFrame = useCallback(() => {
    if (!videoRef?.current || !canvasRef.current || !isPlaying) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const { analysisWidth, analysisHeight, samplesPerZone, colorSampling } = performanceConfig;
    
    // Set canvas dimensions
    canvas.width = analysisWidth;
    canvas.height = analysisHeight;
    
    try {
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, analysisWidth, analysisHeight);
      const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
      const data = imageData.data;
      
      // Analyze colors by zones
      const zoneColors = [];
      const centerX = analysisWidth / 2;
      const centerY = analysisHeight / 2;
      const radius = Math.min(centerX, centerY) * 0.8;
      
      for (let zoneIndex = 0; zoneIndex < zones; zoneIndex++) {
        const angle = (zoneIndex / zones) * Math.PI * 2;
        const colors = [];
        
        // Sample colors in the zone area
        for (let sample = 0; sample < samplesPerZone; sample++) {
          const sampleAngle = angle + (sample - samplesPerZone / 2) * 0.2;
          const sampleRadius = radius * (0.5 + (sample / samplesPerZone) * 0.5);
          
          const x = Math.round(centerX + Math.cos(sampleAngle) * sampleRadius);
          const y = Math.round(centerY + Math.sin(sampleAngle) * sampleRadius);
          
          if (x >= 0 && x < analysisWidth && y >= 0 && y < analysisHeight) {
            const pixelIndex = (y * analysisWidth + x) * 4;
            colors.push({
              r: data[pixelIndex],
              g: data[pixelIndex + 1],
              b: data[pixelIndex + 2]
            });
          }
        }
        
        // Calculate average color for the zone
        if (colors.length > 0) {
          const avgColor = colors.reduce(
            (acc, color) => ({
              r: acc.r + color.r,
              g: acc.g + color.g,
              b: acc.b + color.b
            }),
            { r: 0, g: 0, b: 0 }
          );
          
          avgColor.r = Math.round(avgColor.r / colors.length);
          avgColor.g = Math.round(avgColor.g / colors.length);
          avgColor.b = Math.round(avgColor.b / colors.length);
          
          // Calculate brightness
          const brightness = (avgColor.r * 0.299 + avgColor.g * 0.587 + avgColor.b * 0.114) / 255;
          
          zoneColors.push({ ...avgColor, brightness, zone: zoneIndex });
        } else {
          zoneColors.push({ r: 0, g: 0, b: 0, brightness: 0, zone: zoneIndex });
        }
      }
      
      return zoneColors;
    } catch (error) {
      console.warn('Video analysis failed:', error);
      return null;
    }
  }, [videoRef, isPlaying, zones, performanceConfig]);

  // Smooth color transitions
  const smoothColors = useCallback((newColors, previousColors) => {
    if (!previousColors || previousColors.length === 0) return newColors;
    
    return newColors.map((newColor, index) => {
      const prevColor = previousColors[index] || { r: 0, g: 0, b: 0 };
      
      return {
        ...newColor,
        r: Math.round(prevColor.r * smoothing + newColor.r * (1 - smoothing)),
        g: Math.round(prevColor.g * smoothing + newColor.g * (1 - smoothing)),
        b: Math.round(prevColor.b * smoothing + newColor.b * (1 - smoothing))
      };
    });
  }, [smoothing]);

  // Apply lighting mode effects
  const applyLightingMode = useCallback((colors) => {
    switch (mode) {
      case 'ambilight':
        // Full spectrum ambilight effect
        return colors.map(color => ({
          ...color,
          r: Math.min(255, color.r * 1.2),
          g: Math.min(255, color.g * 1.2),
          b: Math.min(255, color.b * 1.2)
        }));
        
      case 'cinema':
        // Warm, dimmed lighting for cinematic experience
        return colors.map(color => ({
          ...color,
          r: Math.min(255, color.r * 0.8 + 20),
          g: Math.min(255, color.g * 0.7 + 10),
          b: Math.min(255, color.b * 0.6)
        }));
        
      case 'party':
        // Enhanced, vibrant colors
        return colors.map((color, index) => {
          const time = Date.now() * 0.001;
          const wave = Math.sin(time + index * 0.5) * 0.3 + 1;
          
          return {
            ...color,
            r: Math.min(255, color.r * wave),
            g: Math.min(255, color.g * wave * 1.1),
            b: Math.min(255, color.b * wave * 1.2)
          };
        });
        
      case 'focus':
        // Subtle, uniform lighting
        const avgColor = colors.reduce(
          (acc, color) => ({
            r: acc.r + color.r / colors.length,
            g: acc.g + color.g / colors.length,
            b: acc.b + color.b / colors.length
          }),
          { r: 0, g: 0, b: 0 }
        );
        
        return colors.map(() => ({
          ...avgColor,
          r: Math.round(avgColor.r * 0.5),
          g: Math.round(avgColor.g * 0.5),
          b: Math.round(avgColor.b * 0.5)
        }));
        
      default:
        return colors;
    }
  }, [mode]);

  // Main analysis and update loop
  useEffect(() => {
    if (!isPlaying || mode === 'off' || !videoRef?.current) {
      setIsActive(false);
      return;
    }
    
    setIsActive(true);
    
    const updateLighting = () => {
      const now = Date.now();
      
      // Skip analysis if too frequent (performance optimization)
      if (now - lastAnalysisRef.current < performanceConfig.updateInterval) {
        analysisRef.current = requestAnimationFrame(updateLighting);
        return;
      }
      
      lastAnalysisRef.current = now;
      frameCountRef.current++;
      
      // Analyze video frame
      const frameColors = analyzeVideoFrame();
      
      if (frameColors) {
        // Apply smoothing
        const smoothedColors = smoothColors(frameColors, currentColors);
        
        // Apply lighting mode effects
        const processedColors = customColors || applyLightingMode(smoothedColors);
        
        // Update color history for advanced effects
        colorHistoryRef.current = [
          ...colorHistoryRef.current.slice(-10),
          processedColors
        ];
        
        setCurrentColors(processedColors);
        
        // Notify parent component of color changes
        if (onColorChange) {
          onColorChange(processedColors);
        }
      }
      
      analysisRef.current = requestAnimationFrame(updateLighting);
    };
    
    analysisRef.current = requestAnimationFrame(updateLighting);
    
    return () => {
      if (analysisRef.current) {
        cancelAnimationFrame(analysisRef.current);
      }
    };
  }, [
    isPlaying, 
    mode, 
    analyzeVideoFrame, 
    smoothColors, 
    applyLightingMode, 
    performanceConfig,
    customColors,
    currentColors,
    onColorChange
  ]);

  // Generate CSS custom properties for lighting zones
  const lightingStyles = useMemo(() => {
    if (!currentColors.length || !isActive) {
      return {};
    }
    
    const styles = {};
    
    currentColors.forEach((color, index) => {
      const alpha = intensity * (batteryOptimization && batteryLevel < 0.3 ? 0.5 : 1);
      styles[`--ambient-color-${index}`] = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    });
    
    styles['--ambient-intensity'] = intensity;
    styles['--ambient-zones'] = zones;
    
    return styles;
  }, [currentColors, isActive, intensity, zones, batteryOptimization, batteryLevel]);

  if (mode === 'off' || !isActive) {
    return null;
  }

  return (
    <>
      {/* Hidden canvas for video analysis */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      {/* Ambient lighting effects */}
      <div
        className={styles.ambientLighting}
        style={lightingStyles}
        data-mode={mode}
        data-zones={zones}
        data-performance={performanceLevel}
      >
        {/* Lighting zones */}
        {currentColors.map((color, index) => {
          const angle = (index / zones) * 360;
          const distance = 120; // Distance from center
          const size = Math.max(100, 300 / zones);
          
          return (
            <motion.div
              key={`zone-${index}`}
              className={styles.lightingZone}
              style={{
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                background: `radial-gradient(circle, rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.8}) 0%, transparent 70%)`,
                borderRadius: '50%',
                left: `calc(50% + ${Math.cos((angle - 90) * Math.PI / 180) * distance}px)`,
                top: `calc(50% + ${Math.sin((angle - 90) * Math.PI / 180) * distance}px)`,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                filter: 'blur(40px)',
                zIndex: -1
              }}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 3 + (index * 0.2),
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          );
        })}
        
        {/* Central glow effect */}
        {currentColors.length > 0 && (
          <motion.div
            className={styles.centralGlow}
            style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${
                currentColors.length > 0 
                  ? `rgba(${currentColors[0].r}, ${currentColors[0].g}, ${currentColors[0].b}, ${intensity * 0.3})`
                  : 'transparent'
              } 0%, transparent 70%)`,
              borderRadius: '50%',
              pointerEvents: 'none',
              filter: 'blur(60px)',
              zIndex: -2
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}
      </div>
    </>
  );
};

export default AmbientLighting;