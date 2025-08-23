import { useReducer, useCallback, useEffect, useRef } from 'react';

/**
 * Advanced Player State with AI-powered features
 * - Adaptive UI based on user behavior
 * - Smart gesture recognition
 * - Intelligent volume management
 * - Performance optimization
 * - User preference learning
 */

const initialState = {
  // Core playback state
  isPlaying: false,
  volume: 0.8,
  previousVolume: 0.8,
  isMuted: false,
  duration: 0,
  currentTime: 0,
  buffered: 0,
  isSeeking: false,
  isFullscreen: false,
  error: null,
  loadStartTime: performance.now(),
  lastProgressMilestone: 0,

  // Advanced UI state
  uiTheme: 'dark',
  ambientIntensity: 0.7,
  particlesEnabled: true,
  gestureVisualFeedback: true,
  subtitleStyle: {
    fontSize: 'medium',
    position: 'bottom',
    background: 'glass',
    animation: true
  },

  // AI-powered features
  adaptiveQuality: true,
  predictiveBuffering: true,
  contentAwareSubtitles: true,
  intelligentVolume: true,
  smartGestures: true,

  // Performance tracking
  performanceMode: 'auto', // auto, performance, quality
  batteryOptimization: false,
  networkAdaptation: true,

  // User behavior analytics
  userPreferences: {
    preferredQuality: 'auto',
    preferredLanguage: 'en',
    volumePattern: [],
    seekingBehavior: [],
    gestureUsage: {}
  },

  // Picture-in-Picture
  pipEnabled: false,
  pipPosition: { x: 20, y: 20 },
  pipSize: { width: 320, height: 180 },

  // Advanced controls
  playbackSpeed: 1.0,
  audioTrack: 0,
  videoFilters: {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    sharpness: 0
  },

  // UI timing
  uiHideTimeout: null,
  lastInteraction: Date.now(),
  autoHideDelay: 5000
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAY':
      return { 
        ...state, 
        isPlaying: true,
        lastInteraction: Date.now()
      };

    case 'PAUSE':
      return { 
        ...state, 
        isPlaying: false,
        lastInteraction: Date.now()
      };

    case 'TOGGLE_PLAY':
      return { 
        ...state, 
        isPlaying: !state.isPlaying,
        lastInteraction: Date.now()
      };

    case 'SET_VOLUME':
      const volume = Math.max(0, Math.min(1, action.payload));
      const shouldUnmute = volume > 0 && state.isMuted;
      
      // Learn volume patterns for intelligent adjustment
      const newVolumePattern = [
        ...state.userPreferences.volumePattern.slice(-9),
        { volume, timestamp: Date.now() }
      ];

      return { 
        ...state, 
        volume,
        previousVolume: volume > 0 ? volume : state.previousVolume,
        isMuted: shouldUnmute ? false : state.isMuted,
        userPreferences: {
          ...state.userPreferences,
          volumePattern: newVolumePattern
        },
        lastInteraction: Date.now()
      };

    case 'ADJUST_VOLUME':
      const adjustment = action.payload;
      const newVolume = Math.max(0, Math.min(1, state.volume + adjustment));
      return reducer(state, { type: 'SET_VOLUME', payload: newVolume });

    case 'TOGGLE_MUTE':
      if (state.isMuted) {
        return { 
          ...state, 
          isMuted: false,
          volume: state.previousVolume > 0 ? state.previousVolume : 0.5,
          lastInteraction: Date.now()
        };
      } else {
        return { 
          ...state, 
          isMuted: true,
          previousVolume: state.volume > 0 ? state.volume : 0.5,
          lastInteraction: Date.now()
        };
      }

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_BUFFERED':
      return { ...state, buffered: action.payload };

    case 'SET_SEEKING':
      const seekingBehavior = action.payload ? [
        ...state.userPreferences.seekingBehavior.slice(-19),
        { time: state.currentTime, timestamp: Date.now() }
      ] : state.userPreferences.seekingBehavior;

      return { 
        ...state, 
        isSeeking: action.payload,
        userPreferences: {
          ...state.userPreferences,
          seekingBehavior
        },
        lastInteraction: Date.now()
      };

    case 'SEEK':
      const seekTime = Math.max(0, Math.min(action.payload, state.duration));
      return {
        ...state,
        currentTime: seekTime,
        lastInteraction: Date.now()
      };

    case 'SET_FULLSCREEN':
      return { 
        ...state, 
        isFullscreen: action.payload,
        lastInteraction: Date.now()
      };

    case 'TOGGLE_FULLSCREEN':
      return { 
        ...state, 
        isFullscreen: !state.isFullscreen,
        lastInteraction: Date.now()
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    // Advanced features
    case 'SET_AMBIENT_INTENSITY':
      return { 
        ...state, 
        ambientIntensity: Math.max(0, Math.min(1, action.payload)),
        lastInteraction: Date.now()
      };

    case 'TOGGLE_PARTICLES':
      return { 
        ...state, 
        particlesEnabled: !state.particlesEnabled,
        lastInteraction: Date.now()
      };

    case 'SET_SUBTITLE_STYLE':
      return {
        ...state,
        subtitleStyle: { ...state.subtitleStyle, ...action.payload },
        lastInteraction: Date.now()
      };

    case 'SET_PLAYBACK_SPEED':
      const speed = Math.max(0.25, Math.min(3, action.payload));
      return {
        ...state,
        playbackSpeed: speed,
        lastInteraction: Date.now()
      };

    case 'SET_VIDEO_FILTERS':
      return {
        ...state,
        videoFilters: { ...state.videoFilters, ...action.payload },
        lastInteraction: Date.now()
      };

    case 'SET_PIP_ENABLED':
      return {
        ...state,
        pipEnabled: action.payload,
        lastInteraction: Date.now()
      };

    case 'SET_PIP_POSITION':
      return {
        ...state,
        pipPosition: action.payload,
        lastInteraction: Date.now()
      };

    case 'SET_PIP_SIZE':
      return {
        ...state,
        pipSize: action.payload,
        lastInteraction: Date.now()
      };

    case 'UPDATE_USER_PREFERENCE':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          [action.key]: action.value
        }
      };

    case 'SET_PERFORMANCE_MODE':
      return {
        ...state,
        performanceMode: action.payload,
        // Auto-adjust features based on performance mode
        particlesEnabled: action.payload === 'performance' ? false : state.particlesEnabled,
        ambientIntensity: action.payload === 'performance' ? 0.3 : state.ambientIntensity
      };

    case 'SET_UI_THEME':
      return {
        ...state,
        uiTheme: action.payload,
        lastInteraction: Date.now()
      };

    case 'RESET_UI_TIMER':
      return {
        ...state,
        lastInteraction: Date.now()
      };

    case 'RECORD_GESTURE':
      const gestureUsage = {
        ...state.userPreferences.gestureUsage,
        [action.gestureType]: (state.userPreferences.gestureUsage[action.gestureType] || 0) + 1
      };
      
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          gestureUsage
        },
        lastInteraction: Date.now()
      };

    case 'SET_LAST_PROGRESS_MILESTONE':
      return {
        ...state,
        lastProgressMilestone: action.payload
      };

    case 'SET_LOAD_START_TIME':
      return {
        ...state,
        loadStartTime: action.payload
      };

    default:
      return state;
  }
};

const useAdvancedPlayerState = (options = {}) => {
  const { 
    enableAI = true, 
    adaptiveControls = true,
    persistPreferences = true 
  } = options;

  const [state, dispatch] = useReducer(reducer, initialState);
  const uiTimerRef = useRef(null);
  const aiAnalysisRef = useRef(null);

  // Core actions
  const setPlaying = useCallback((isPlaying) => {
    dispatch({ type: isPlaying ? 'PLAY' : 'PAUSE' });
  }, []);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  const setVolume = useCallback((volume) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);

  const adjustVolume = useCallback((delta) => {
    dispatch({ type: 'ADJUST_VOLUME', payload: delta });
  }, []);

  const toggleMute = useCallback(() => {
    dispatch({ type: 'TOGGLE_MUTE' });
  }, []);

  const setDuration = useCallback((duration) => {
    dispatch({ type: 'SET_DURATION', payload: duration });
  }, []);

  const setCurrentTime = useCallback((time) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, []);

  const setBuffered = useCallback((time) => {
    dispatch({ type: 'SET_BUFFERED', payload: time });
  }, []);

  const setSeeking = useCallback((isSeeking) => {
    dispatch({ type: 'SET_SEEKING', payload: isSeeking });
  }, []);

  const seek = useCallback((time) => {
    dispatch({ type: 'SEEK', payload: time });
  }, []);

  const setFullscreen = useCallback((isFullscreen) => {
    dispatch({ type: 'SET_FULLSCREEN', payload: isFullscreen });
  }, []);

  const toggleFullscreen = useCallback(() => {
    dispatch({ type: 'TOGGLE_FULLSCREEN' });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Advanced actions
  const setAmbientIntensity = useCallback((intensity) => {
    dispatch({ type: 'SET_AMBIENT_INTENSITY', payload: intensity });
  }, []);

  const toggleParticles = useCallback(() => {
    dispatch({ type: 'TOGGLE_PARTICLES' });
  }, []);

  const setSubtitleStyle = useCallback((style) => {
    dispatch({ type: 'SET_SUBTITLE_STYLE', payload: style });
  }, []);

  const setPlaybackSpeed = useCallback((speed) => {
    dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
  }, []);

  const setVideoFilters = useCallback((filters) => {
    dispatch({ type: 'SET_VIDEO_FILTERS', payload: filters });
  }, []);

  const setPipEnabled = useCallback((enabled) => {
    dispatch({ type: 'SET_PIP_ENABLED', payload: enabled });
  }, []);

  const setPipPosition = useCallback((position) => {
    dispatch({ type: 'SET_PIP_POSITION', payload: position });
  }, []);

  const setPipSize = useCallback((size) => {
    dispatch({ type: 'SET_PIP_SIZE', payload: size });
  }, []);

  const setPerformanceMode = useCallback((mode) => {
    dispatch({ type: 'SET_PERFORMANCE_MODE', payload: mode });
  }, []);

  const setUITheme = useCallback((theme) => {
    dispatch({ type: 'SET_UI_THEME', payload: theme });
  }, []);

  const resetUITimer = useCallback(() => {
    dispatch({ type: 'RESET_UI_TIMER' });
  }, []);

  const recordGesture = useCallback((gestureType) => {
    dispatch({ type: 'RECORD_GESTURE', gestureType });
  }, []);

  const updateUserPreference = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_USER_PREFERENCE', key, value });
  }, []);

  const setLastProgressMilestone = useCallback((milestone) => {
    dispatch({ type: 'SET_LAST_PROGRESS_MILESTONE', payload: milestone });
  }, []);

  const setLoadStartTime = useCallback((time) => {
    dispatch({ type: 'SET_LOAD_START_TIME', payload: time });
  }, []);

  // AI-powered intelligent volume adjustment
  const intelligentVolumeAdjust = useCallback(() => {
    if (!enableAI || state.userPreferences.volumePattern.length < 3) return;

    const recentPatterns = state.userPreferences.volumePattern.slice(-5);
    const avgVolume = recentPatterns.reduce((sum, p) => sum + p.volume, 0) / recentPatterns.length;
    const currentHour = new Date().getHours();
    
    // Night mode volume reduction (10 PM - 7 AM)
    if (currentHour >= 22 || currentHour <= 7) {
      if (state.volume > avgVolume * 0.7) {
        setVolume(avgVolume * 0.7);
        console.log('🤖 AI: Night mode volume adjustment applied');
      }
    }
    
    // Content-aware volume (if volume has been consistently low for similar content)
    const timeOfDayPatterns = recentPatterns.filter(p => {
      const patternHour = new Date(p.timestamp).getHours();
      return Math.abs(patternHour - currentHour) <= 2;
    });
    
    if (timeOfDayPatterns.length >= 3) {
      const timeAvgVolume = timeOfDayPatterns.reduce((sum, p) => sum + p.volume, 0) / timeOfDayPatterns.length;
      if (Math.abs(state.volume - timeAvgVolume) > 0.3) {
        setVolume(timeAvgVolume);
        console.log('🤖 AI: Time-based volume pattern adjustment applied');
      }
    }
  }, [enableAI, state.userPreferences.volumePattern, state.volume, setVolume]);

  // Battery optimization detection
  useEffect(() => {
    if (!enableAI || typeof navigator === 'undefined' || !navigator.getBattery) return;

    navigator.getBattery().then(battery => {
      const updateBatteryOptimization = () => {
        const lowBattery = battery.level < 0.2 && !battery.charging;
        dispatch({ type: 'SET_PERFORMANCE_MODE', payload: lowBattery ? 'performance' : 'auto' });
        console.log(`🤖 AI: Battery optimization ${lowBattery ? 'enabled' : 'disabled'}`);
      };

      battery.addEventListener('levelchange', updateBatteryOptimization);
      battery.addEventListener('chargingchange', updateBatteryOptimization);
      updateBatteryOptimization();

      return () => {
        battery.removeEventListener('levelchange', updateBatteryOptimization);
        battery.removeEventListener('chargingchange', updateBatteryOptimization);
      };
    });
  }, [enableAI]);

  // AI analysis interval for intelligent adjustments
  useEffect(() => {
    if (!enableAI) return;

    aiAnalysisRef.current = setInterval(() => {
      intelligentVolumeAdjust();
    }, 30000); // Run AI analysis every 30 seconds

    return () => {
      if (aiAnalysisRef.current) {
        clearInterval(aiAnalysisRef.current);
      }
    };
  }, [enableAI, intelligentVolumeAdjust]);

  // Persist user preferences
  useEffect(() => {
    if (!persistPreferences || typeof localStorage === 'undefined') return;

    const preferences = {
      volume: state.volume,
      subtitleStyle: state.subtitleStyle,
      ambientIntensity: state.ambientIntensity,
      particlesEnabled: state.particlesEnabled,
      uiTheme: state.uiTheme,
      playbackSpeed: state.playbackSpeed,
      userPreferences: state.userPreferences
    };

    localStorage.setItem('futuristicPlayer_preferences', JSON.stringify(preferences));
  }, [
    persistPreferences,
    state.volume,
    state.subtitleStyle,
    state.ambientIntensity,
    state.particlesEnabled,
    state.uiTheme,
    state.playbackSpeed,
    state.userPreferences
  ]);

  // Load saved preferences on mount
  useEffect(() => {
    if (!persistPreferences || typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('futuristicPlayer_preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        Object.entries(preferences).forEach(([key, value]) => {
          if (key === 'userPreferences') {
            dispatch({ type: 'UPDATE_USER_PREFERENCE', key, value });
          } else {
            dispatch({ type: `SET_${key.toUpperCase()}`, payload: value });
          }
        });
        console.log('🤖 AI: User preferences loaded');
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }, [persistPreferences]);

  const actions = {
    // Core actions
    setPlaying,
    togglePlay,
    setVolume,
    adjustVolume,
    toggleMute,
    setDuration,
    setCurrentTime,
    setBuffered,
    setSeeking,
    seek,
    setFullscreen,
    toggleFullscreen,
    setError,
    clearError,

    // Advanced actions
    setAmbientIntensity,
    toggleParticles,
    setSubtitleStyle,
    setPlaybackSpeed,
    setVideoFilters,
    setPipEnabled,
    setPipPosition,
    setPipSize,
    setPerformanceMode,
    setUITheme,
    resetUITimer,
    recordGesture,
    updateUserPreference,
    setLastProgressMilestone,
    setLoadStartTime,

    // AI actions
    intelligentVolumeAdjust
  };

  return { state, actions };
};

export default useAdvancedPlayerState;