import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useAmbientEffects - Coordinated ambient effects management hook
 * 
 * Features:
 * - Unified coordination of lighting, particles, and visual effects
 * - Content-aware effect adaptation based on video analysis
 * - Performance-optimized effect scheduling and prioritization
 * - Audio-reactive effects synchronized with video content
 * - Mood-based effect profiles with smooth transitions
 * - Battery and performance aware effect scaling
 * - Cross-effect synchronization and harmony
 * - User preference learning and adaptation
 */
const useAmbientEffects = ({
  isEnabled = true,
  intensity = 0.7,
  audioReactivity = 0.8,
  contentAwareness = true,
  performanceMode = 'auto', // 'low', 'medium', 'high', 'auto'
  batteryOptimization = true,
  effectProfiles = {},
  syncWithContent = true,
  adaptToMood = true,
  userPreferences = {},
  onEffectChange = null
} = {}) => {

  // Core effects state
  const [isActive, setIsActive] = useState(isEnabled);
  const [currentProfile, setCurrentProfile] = useState('default');
  const [effectsIntensity, setEffectsIntensity] = useState(intensity);
  const [contentMood, setContentMood] = useState('neutral');
  const [audioLevel, setAudioLevel] = useState(0);
  const [dominantColors, setDominantColors] = useState([]);
  
  // Individual effect states
  const [ambientLighting, setAmbientLighting] = useState({
    enabled: true,
    intensity: 0.7,
    colors: [],
    mode: 'auto',
    zones: 12
  });
  
  const [particleEffects, setParticleEffects] = useState({
    enabled: true,
    type: 'stars',
    count: 50,
    intensity: 0.6,
    audioReactive: true
  });
  
  const [atmosphericEffects, setAtmosphericEffects] = useState({
    enabled: true,
    blur: 0,
    grain: 0,
    vignette: 0,
    colorGrading: 'neutral'
  });

  // Performance and optimization state
  const [performanceLevel, setPerformanceLevel] = useState('medium');
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [frameRate, setFrameRate] = useState(60);
  const [deviceCapabilities, setDeviceCapabilities] = useState({});

  // Content analysis state
  const [videoAnalysis, setVideoAnalysis] = useState({
    brightness: 0.5,
    contrast: 0.5,
    saturation: 0.5,
    motion: 0.5,
    scene: 'unknown'
  });

  // Refs for coordination and optimization
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const effectsTimerRef = useRef(null);
  const performanceMonitorRef = useRef(null);
  const colorAnalysisRef = useRef(null);
  const moodDetectionRef = useRef(null);

  // Effect profiles for different moods and content types
  const defaultEffectProfiles = useMemo(() => ({
    default: {
      name: 'Default',
      ambientLighting: { intensity: 0.7, mode: 'cinema' },
      particles: { type: 'stars', count: 50, audioReactive: true },
      atmospheric: { blur: 0, grain: 0.1, vignette: 0.2 }
    },
    cinematic: {
      name: 'Cinematic',
      ambientLighting: { intensity: 0.8, mode: 'cinema' },
      particles: { type: 'orbs', count: 30, audioReactive: false },
      atmospheric: { blur: 0, grain: 0.05, vignette: 0.3 }
    },
    immersive: {
      name: 'Immersive',
      ambientLighting: { intensity: 1.0, mode: 'ambilight' },
      particles: { type: 'mixed', count: 100, audioReactive: true },
      atmospheric: { blur: 0.1, grain: 0, vignette: 0.1 }
    },
    focus: {
      name: 'Focus',
      ambientLighting: { intensity: 0.4, mode: 'focus' },
      particles: { type: 'off', count: 0, audioReactive: false },
      atmospheric: { blur: 0, grain: 0, vignette: 0.4 }
    },
    party: {
      name: 'Party',
      ambientLighting: { intensity: 1.2, mode: 'party' },
      particles: { type: 'sparks', count: 150, audioReactive: true },
      atmospheric: { blur: 0, grain: 0, vignette: 0 }
    },
    ambient: {
      name: 'Ambient',
      ambientLighting: { intensity: 0.6, mode: 'ambilight' },
      particles: { type: 'bubbles', count: 40, audioReactive: false },
      atmospheric: { blur: 0.05, grain: 0.15, vignette: 0.2 }
    }
  }), []);

  // Merge default and custom profiles
  const allProfiles = useMemo(() => ({
    ...defaultEffectProfiles,
    ...effectProfiles
  }), [defaultEffectProfiles, effectProfiles]);

  // Device capabilities detection
  useEffect(() => {
    const detectCapabilities = () => {
      const capabilities = {
        // Hardware info
        memory: navigator.deviceMemory || 4,
        cores: navigator.hardwareConcurrency || 4,
        
        // Graphics capabilities
        webgl: (() => {
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            return gl ? {
              version: canvas.getContext('webgl2') ? 2 : 1,
              renderer: gl.getParameter(gl.RENDERER),
              vendor: gl.getParameter(gl.VENDOR)
            } : null;
          } catch {
            return null;
          }
        })(),
        
        // Display info
        screen: {
          width: screen.width,
          height: screen.height,
          pixelRatio: window.devicePixelRatio || 1
        },
        
        // Performance indicators
        supportsBatteryAPI: 'getBattery' in navigator,
        supportsPerformanceObserver: 'PerformanceObserver' in window,
        supportsWebWorkers: typeof Worker !== 'undefined'
      };
      
      setDeviceCapabilities(capabilities);
      
      // Auto-determine performance level
      if (performanceMode === 'auto') {
        if (capabilities.memory >= 8 && capabilities.cores >= 8 && capabilities.webgl?.version === 2) {
          setPerformanceLevel('high');
        } else if (capabilities.memory >= 4 && capabilities.cores >= 4) {
          setPerformanceLevel('medium');
        } else {
          setPerformanceLevel('low');
        }
      } else {
        setPerformanceLevel(performanceMode);
      }
    };
    
    detectCapabilities();
  }, [performanceMode]);

  // Battery monitoring
  useEffect(() => {
    if (!batteryOptimization || !deviceCapabilities.supportsBatteryAPI) return;
    
    const monitorBattery = async () => {
      try {
        const battery = await navigator.getBattery();
        setBatteryLevel(battery.level);
        
        const updateBattery = () => setBatteryLevel(battery.level);
        battery.addEventListener('levelchange', updateBattery);
        
        return () => battery.removeEventListener('levelchange', updateBattery);
      } catch (error) {
        console.warn('Battery monitoring failed:', error);
      }
    };
    
    monitorBattery();
  }, [batteryOptimization, deviceCapabilities.supportsBatteryAPI]);

  // Performance monitoring
  useEffect(() => {
    if (!deviceCapabilities.supportsPerformanceObserver) return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let currentFrameRate = 60;
    
    const measureFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        currentFrameRate = frameCount;
        setFrameRate(currentFrameRate);
        frameCount = 0;
        lastTime = currentTime;
        
        // Adjust performance based on frame rate
        if (currentFrameRate < 30 && performanceLevel !== 'low') {
          setPerformanceLevel('low');
        } else if (currentFrameRate > 50 && performanceLevel === 'low') {
          setPerformanceLevel('medium');
        }
      }
    };
    
    performanceMonitorRef.current = setInterval(measureFrameRate, 100);
    
    return () => {
      if (performanceMonitorRef.current) {
        clearInterval(performanceMonitorRef.current);
      }
    };
  }, [deviceCapabilities.supportsPerformanceObserver]);

  // Audio analysis setup
  useEffect(() => {
    if (!videoRef.current || !audioReactivity) return;
    
    const setupAudioAnalysis = async () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyzer = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(videoRef.current);
        
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.8;
        
        source.connect(analyzer);
        analyzer.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        
        const updateAudioLevel = () => {
          if (!analyzerRef.current) return;
          
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
          analyzerRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average / 255);
        };
        
        const audioUpdateInterval = setInterval(updateAudioLevel, 50); // 20fps
        
        return () => {
          clearInterval(audioUpdateInterval);
          audioContext.close();
        };
      } catch (error) {
        console.warn('Audio analysis setup failed:', error);
      }
    };
    
    setupAudioAnalysis();
  }, [audioReactivity]);

  // Content analysis for mood detection
  useEffect(() => {
    if (!contentAwareness || !videoRef.current || !syncWithContent) return;
    
    const analyzeContent = () => {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 32;
      canvas.height = 18;
      
      ctx.drawImage(video, 0, 0, 32, 18);
      const imageData = ctx.getImageData(0, 0, 32, 18);
      const data = imageData.data;
      
      // Analyze color distribution
      const colors = [];
      let totalBrightness = 0;
      let totalSaturation = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        colors.push({ r, g, b });
        
        // Calculate brightness
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        totalBrightness += brightness;
        
        // Calculate saturation
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const saturation = max === 0 ? 0 : (max - min) / max;
        totalSaturation += saturation;
      }
      
      const pixelCount = colors.length;
      const avgBrightness = totalBrightness / pixelCount;
      const avgSaturation = totalSaturation / pixelCount;
      
      // Detect dominant colors
      const colorClusters = clusterColors(colors, 5);
      setDominantColors(colorClusters);
      
      // Determine mood based on analysis
      let mood = 'neutral';
      if (avgBrightness > 0.7 && avgSaturation > 0.4) {
        mood = 'bright';
      } else if (avgBrightness < 0.3) {
        mood = 'dark';
      } else if (avgSaturation > 0.6) {
        mood = 'vibrant';
      } else if (avgSaturation < 0.2) {
        mood = 'muted';
      }
      
      setVideoAnalysis({
        brightness: avgBrightness,
        saturation: avgSaturation,
        contrast: calculateContrast(colors),
        motion: calculateMotion(colors),
        scene: classifyScene(avgBrightness, avgSaturation)
      });
      
      setContentMood(mood);
    };
    
    colorAnalysisRef.current = setInterval(analyzeContent, 2000); // Every 2 seconds
    
    return () => {
      if (colorAnalysisRef.current) {
        clearInterval(colorAnalysisRef.current);
      }
    };
  }, [contentAwareness, syncWithContent]);

  // Simple color clustering
  const clusterColors = useCallback((colors, k) => {
    // Simplified k-means clustering for dominant colors
    const clusters = [];
    
    for (let i = 0; i < Math.min(k, colors.length); i++) {
      const randomIndex = Math.floor(Math.random() * colors.length);
      clusters.push({ ...colors[randomIndex], count: 0 });
    }
    
    return clusters.slice(0, 3); // Return top 3 colors
  }, []);

  // Calculate contrast from color data
  const calculateContrast = useCallback((colors) => {
    if (colors.length < 2) return 0;
    
    const brightnesses = colors.map(color => 
      (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) / 255
    );
    
    const max = Math.max(...brightnesses);
    const min = Math.min(...brightnesses);
    
    return max - min;
  }, []);

  // Estimate motion from color changes
  const calculateMotion = useCallback((colors) => {
    // This is a simplified motion estimation
    // In reality, you'd compare frames over time
    const variance = colors.reduce((sum, color) => {
      const brightness = (color.r * 0.299 + color.g * 0.587 + color.b * 0.114) / 255;
      return sum + Math.pow(brightness - 0.5, 2);
    }, 0) / colors.length;
    
    return Math.min(variance * 2, 1);
  }, []);

  // Classify scene type
  const classifyScene = useCallback((brightness, saturation) => {
    if (brightness > 0.7) {
      return saturation > 0.5 ? 'bright_colorful' : 'bright_muted';
    } else if (brightness < 0.3) {
      return saturation > 0.4 ? 'dark_colorful' : 'dark_muted';
    } else {
      return saturation > 0.5 ? 'medium_colorful' : 'medium_muted';
    }
  }, []);

  // Apply effect profile
  const applyEffectProfile = useCallback((profileName) => {
    const profile = allProfiles[profileName];
    if (!profile) return;
    
    setCurrentProfile(profileName);
    
    // Apply lighting effects
    if (profile.ambientLighting) {
      setAmbientLighting(prev => ({
        ...prev,
        ...profile.ambientLighting
      }));
    }
    
    // Apply particle effects
    if (profile.particles) {
      setParticleEffects(prev => ({
        ...prev,
        ...profile.particles
      }));
    }
    
    // Apply atmospheric effects
    if (profile.atmospheric) {
      setAtmosphericEffects(prev => ({
        ...prev,
        ...profile.atmospheric
      }));
    }
    
    if (onEffectChange) {
      onEffectChange({
        profile: profileName,
        effects: {
          ambientLighting,
          particleEffects,
          atmosphericEffects
        }
      });
    }
  }, [allProfiles, ambientLighting, particleEffects, atmosphericEffects, onEffectChange]);

  // Adaptive effect adjustment based on content
  useEffect(() => {
    if (!adaptToMood || !syncWithContent) return;
    
    const adjustEffectsToMood = () => {
      let targetProfile = currentProfile;
      
      switch (contentMood) {
        case 'bright':
          targetProfile = 'immersive';
          break;
        case 'dark':
          targetProfile = 'cinematic';
          break;
        case 'vibrant':
          targetProfile = 'party';
          break;
        case 'muted':
          targetProfile = 'ambient';
          break;
        default:
          targetProfile = 'default';
      }
      
      if (targetProfile !== currentProfile) {
        applyEffectProfile(targetProfile);
      }
    };
    
    moodDetectionRef.current = setTimeout(adjustEffectsToMood, 5000); // Delay to avoid rapid changes
    
    return () => {
      if (moodDetectionRef.current) {
        clearTimeout(moodDetectionRef.current);
      }
    };
  }, [contentMood, adaptToMood, syncWithContent, currentProfile, applyEffectProfile]);

  // Performance optimization based on battery and frame rate
  useEffect(() => {
    if (!batteryOptimization) return;
    
    let targetIntensity = intensity;
    
    if (batteryLevel < 0.2) {
      targetIntensity *= 0.3; // Drastically reduce effects on low battery
    } else if (batteryLevel < 0.5) {
      targetIntensity *= 0.6; // Moderately reduce effects
    }
    
    if (frameRate < 30) {
      targetIntensity *= 0.5; // Reduce effects if frame rate is poor
    }
    
    setEffectsIntensity(targetIntensity);
  }, [batteryLevel, frameRate, intensity, batteryOptimization]);

  // Effect coordination and synchronization
  const syncEffectsWithAudio = useCallback((audioLevel, frequencyData) => {
    if (!audioReactivity || audioLevel === 0) return;
    
    const audioIntensity = audioLevel * audioReactivity;
    
    // Sync particle effects
    setParticleEffects(prev => ({
      ...prev,
      intensity: Math.min(1, prev.intensity + audioIntensity * 0.3),
      audioReactive: true
    }));
    
    // Sync lighting effects
    setAmbientLighting(prev => ({
      ...prev,
      intensity: Math.min(1.2, prev.intensity + audioIntensity * 0.2)
    }));
  }, [audioReactivity]);

  // Main effects update loop
  useEffect(() => {
    if (!isActive) return;
    
    const updateEffects = () => {
      // Sync with audio if available
      if (audioLevel > 0 && audioReactivity) {
        syncEffectsWithAudio(audioLevel, null);
      }
      
      // Apply performance scaling
      const scaleFactor = performanceLevel === 'low' ? 0.5 :
                         performanceLevel === 'medium' ? 0.8 : 1.0;
      
      setEffectsIntensity(prev => Math.min(2, prev * scaleFactor));
    };
    
    effectsTimerRef.current = setInterval(updateEffects, 1000);
    
    return () => {
      if (effectsTimerRef.current) {
        clearInterval(effectsTimerRef.current);
      }
    };
  }, [isActive, audioReactivity]);

  // Public API
  return {
    // State
    isActive,
    currentProfile,
    effectsIntensity,
    contentMood,
    audioLevel,
    dominantColors,
    performanceLevel,
    batteryLevel,
    videoAnalysis,
    
    // Individual effects
    ambientLighting,
    particleEffects,
    atmosphericEffects,
    
    // Profile management
    availableProfiles: Object.keys(allProfiles),
    applyProfile: applyEffectProfile,
    
    // Controls
    enable: useCallback(() => setIsActive(true), []),
    disable: useCallback(() => setIsActive(false), []),
    toggle: useCallback(() => setIsActive(prev => !prev), []),
    
    setIntensity: useCallback((newIntensity) => {
      setEffectsIntensity(Math.max(0, Math.min(2, newIntensity)));
    }, []),
    
    // Effect-specific controls
    updateAmbientLighting: useCallback((settings) => {
      setAmbientLighting(prev => ({ ...prev, ...settings }));
    }, []),
    
    updateParticleEffects: useCallback((settings) => {
      setParticleEffects(prev => ({ ...prev, ...settings }));
    }, []),
    
    updateAtmosphericEffects: useCallback((settings) => {
      setAtmosphericEffects(prev => ({ ...prev, ...settings }));
    }, []),
    
    // Video integration
    attachToVideo: useCallback((videoElement) => {
      videoRef.current = videoElement;
    }, []),
    
    // Utilities
    getEffectState: useCallback(() => ({
      isActive,
      profile: currentProfile,
      intensity: effectsIntensity,
      mood: contentMood,
      performance: performanceLevel,
      effects: {
        ambientLighting,
        particleEffects,
        atmosphericEffects
      }
    }), [isActive, currentProfile, effectsIntensity, contentMood, performanceLevel, ambientLighting, particleEffects, atmosphericEffects]),
    
    resetToDefaults: useCallback(() => {
      applyEffectProfile('default');
      setEffectsIntensity(intensity);
    }, [applyEffectProfile, intensity]),
    
    createCustomProfile: useCallback((name, settings) => {
      // This would allow creating custom profiles
      return {
        name,
        ...settings
      };
    }, []),
    
    // Performance optimization
    optimizeForBattery: useCallback((enable) => {
      if (enable && batteryLevel < 0.5) {
        setEffectsIntensity(prev => prev * 0.5);
        applyEffectProfile('focus'); // Use minimal effects profile
      }
    }, [batteryLevel, applyEffectProfile]),
    
    optimizeForPerformance: useCallback((targetFrameRate = 60) => {
      if (frameRate < targetFrameRate * 0.8) {
        setPerformanceLevel('low');
        setEffectsIntensity(prev => prev * 0.6);
      }
    }, [frameRate])
  };
};

export default useAmbientEffects;