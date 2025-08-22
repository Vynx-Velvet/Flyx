import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useGestureControls - Advanced gesture recognition and control hook
 * 
 * Features:
 * - Multi-touch gesture recognition (tap, swipe, pinch, rotate, long press)
 * - Customizable gesture mappings and sensitivity settings
 * - Momentum-based interactions with smooth animations
 * - Context-aware gestures based on UI state and content
 * - Performance-optimized gesture processing
 * - Accessibility integration with haptic feedback
 * - Cross-platform support (touch, mouse, stylus)
 * - Gesture learning and adaptation to user patterns
 */
const useGestureControls = ({
  isEnabled = true,
  sensitivity = {
    tap: 10,        // Max distance for tap
    swipe: 50,      // Min distance for swipe
    pinch: 0.1,     // Min scale change for pinch
    rotation: 15,   // Min angle change for rotation (degrees)
    longPress: 500, // Duration for long press (ms)
    doubleTap: 300  // Max time between taps (ms)
  },
  gestureMappings = {},
  enableMomentum = true,
  enableHaptic = true,
  contextAware = true,
  learningEnabled = true,
  onGesture = null,
  onGestureStart = null,
  onGestureEnd = null,
  debugMode = false
} = {}) => {

  // Core gesture state
  const [activeGestures, setActiveGestures] = useState([]);
  const [gestureHistory, setGestureHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContext, setCurrentContext] = useState('default');
  
  // Touch and interaction state
  const [touchPoints, setTouchPoints] = useState([]);
  const [gestureMetrics, setGestureMetrics] = useState({
    velocity: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    center: { x: 0, y: 0 },
    pressure: 1
  });
  
  // Learning and adaptation state
  const [userPreferences, setUserPreferences] = useState({});
  const [gesturePatterns, setGesturePatterns] = useState(new Map());
  const [adaptiveSensitivity, setAdaptiveSensitivity] = useState(sensitivity);

  // Refs for gesture tracking
  const gestureStateRef = useRef({
    isActive: false,
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    initialDistance: 0,
    initialAngle: 0,
    initialScale: 1,
    touchHistory: [],
    momentumTimer: null
  });
  
  const timersRef = useRef({
    longPress: null,
    doubleTap: null,
    momentum: null
  });
  
  const eventHandlersRef = useRef({
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp: null
  });

  // Default gesture mappings
  const defaultGestures = useMemo(() => ({
    // Single touch gestures
    tap: {
      action: 'togglePlayPause',
      context: ['default', 'playing', 'paused'],
      zones: ['center']
    },
    doubleTap: {
      action: 'toggleFullscreen',
      context: ['default'],
      zones: ['center']
    },
    longPress: {
      action: 'showContextMenu',
      context: ['default'],
      zones: ['anywhere']
    },
    
    // Swipe gestures
    swipeLeft: {
      action: 'seekBackward',
      context: ['playing', 'paused'],
      zones: ['anywhere'],
      params: { seconds: 10 }
    },
    swipeRight: {
      action: 'seekForward',
      context: ['playing', 'paused'],
      zones: ['anywhere'],
      params: { seconds: 10 }
    },
    swipeUp: {
      action: 'volumeUp',
      context: ['playing'],
      zones: ['right'],
      params: { amount: 0.1 }
    },
    swipeDown: {
      action: 'volumeDown',
      context: ['playing'],
      zones: ['right'],
      params: { amount: 0.1 }
    },
    
    // Multi-touch gestures
    pinchOut: {
      action: 'zoomIn',
      context: ['default'],
      zones: ['anywhere']
    },
    pinchIn: {
      action: 'zoomOut',
      context: ['default'],
      zones: ['anywhere']
    },
    twoFingerTap: {
      action: 'showQualityMenu',
      context: ['default'],
      zones: ['anywhere']
    },
    twoFingerSwipeUp: {
      action: 'showPlaylist',
      context: ['default'],
      zones: ['anywhere']
    },
    
    // Advanced gestures
    rotate: {
      action: 'adjustBrightness',
      context: ['playing'],
      zones: ['anywhere']
    },
    threeFingerTap: {
      action: 'showSettings',
      context: ['default'],
      zones: ['anywhere']
    }
  }), []);

  // Combined gesture mappings
  const allGestures = useMemo(() => ({
    ...defaultGestures,
    ...gestureMappings
  }), [defaultGestures, gestureMappings]);

  // Calculate distance between two points
  const getDistance = useCallback((p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate angle between two points
  const getAngle = useCallback((p1, p2) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  }, []);

  // Calculate center point of multiple touches
  const getCenter = useCallback((touches) => {
    if (touches.length === 0) return { x: 0, y: 0 };
    
    const sum = touches.reduce((acc, touch) => ({
      x: acc.x + touch.x,
      y: acc.y + touch.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / touches.length,
      y: sum.y / touches.length
    };
  }, []);

  // Determine gesture zone
  const getGestureZone = useCallback((position, containerElement) => {
    if (!containerElement) return 'anywhere';
    
    const rect = containerElement.getBoundingClientRect();
    const relativeX = (position.x - rect.left) / rect.width;
    const relativeY = (position.y - rect.top) / rect.height;
    
    // Define zones
    if (relativeX < 0.2) return 'left';
    if (relativeX > 0.8) return 'right';
    if (relativeY < 0.2) return 'top';
    if (relativeY > 0.8) return 'bottom';
    if (relativeX >= 0.3 && relativeX <= 0.7 && relativeY >= 0.3 && relativeY <= 0.7) return 'center';
    
    return 'anywhere';
  }, []);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type = 'light', pattern = null) => {
    if (!enableHaptic || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      double: [10, 50, 10],
      triple: [10, 50, 10, 50, 10],
      success: [10, 100, 10],
      error: [100, 50, 100, 50, 100]
    };
    
    navigator.vibrate(pattern || patterns[type] || patterns.light);
  }, [enableHaptic]);

  // Execute gesture action
  const executeGesture = useCallback((gestureType, touchData, params = {}) => {
    const gesture = allGestures[gestureType];
    if (!gesture) return false;
    
    // Check context compatibility
    if (contextAware && gesture.context && !gesture.context.includes(currentContext)) {
      return false;
    }
    
    // Check zone compatibility
    const zone = getGestureZone(touchData.center || touchData, touchData.element);
    if (gesture.zones && !gesture.zones.includes(zone) && !gesture.zones.includes('anywhere')) {
      return false;
    }
    
    const gestureEvent = {
      type: gestureType,
      action: gesture.action,
      position: touchData.center || touchData,
      zone,
      context: currentContext,
      params: { ...gesture.params, ...params },
      metrics: gestureMetrics,
      timestamp: Date.now()
    };
    
    // Add to gesture history for learning
    if (learningEnabled) {
      setGestureHistory(prev => [gestureEvent, ...prev.slice(0, 99)]);
      updateGesturePatterns(gestureEvent);
    }
    
    // Trigger haptic feedback
    triggerHaptic('light');
    
    // Execute callback
    if (onGesture) {
      onGesture(gestureEvent);
    }
    
    if (debugMode) {
      console.log('Gesture executed:', gestureEvent);
    }
    
    return true;
  }, [
    allGestures, 
    contextAware, 
    currentContext, 
    getGestureZone, 
    gestureMetrics, 
    learningEnabled, 
    triggerHaptic, 
    onGesture, 
    debugMode
  ]);

  // Update gesture patterns for learning
  const updateGesturePatterns = useCallback((gestureEvent) => {
    const patternKey = `${gestureEvent.type}_${gestureEvent.context}`;
    const patterns = new Map(gesturePatterns);
    
    if (patterns.has(patternKey)) {
      const existing = patterns.get(patternKey);
      patterns.set(patternKey, {
        ...existing,
        count: existing.count + 1,
        lastUsed: Date.now(),
        avgDuration: (existing.avgDuration + (Date.now() - gestureStateRef.current.startTime)) / 2
      });
    } else {
      patterns.set(patternKey, {
        count: 1,
        lastUsed: Date.now(),
        avgDuration: Date.now() - gestureStateRef.current.startTime,
        effectiveness: 1.0
      });
    }
    
    setGesturePatterns(patterns);
  }, [gesturePatterns]);

  // Handle pointer/touch start
  const handlePointerStart = useCallback((event) => {
    if (!isEnabled) return;
    
    event.preventDefault();
    
    const touches = event.touches ? Array.from(event.touches) : [event];
    const touchData = touches.map(touch => ({
      id: touch.identifier || 'mouse',
      x: touch.clientX,
      y: touch.clientY,
      pressure: touch.force || 1,
      timestamp: Date.now()
    }));
    
    setTouchPoints(touchData);
    setIsProcessing(true);
    
    const center = getCenter(touchData);
    const now = Date.now();
    
    // Initialize gesture state
    gestureStateRef.current = {
      isActive: true,
      startTime: now,
      startPosition: center,
      lastPosition: center,
      initialDistance: touchData.length > 1 ? getDistance(touchData[0], touchData[1]) : 0,
      initialAngle: touchData.length > 1 ? getAngle(touchData[0], touchData[1]) : 0,
      initialScale: 1,
      touchHistory: [{ position: center, timestamp: now }],
      momentumTimer: null
    };
    
    // Update metrics
    setGestureMetrics({
      velocity: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      center,
      pressure: touchData.reduce((sum, t) => sum + t.pressure, 0) / touchData.length
    });
    
    // Start long press timer for single touch
    if (touchData.length === 1) {
      timersRef.current.longPress = setTimeout(() => {
        if (gestureStateRef.current.isActive) {
          const distance = getDistance(gestureStateRef.current.startPosition, center);
          if (distance < adaptiveSensitivity.tap) {
            executeGesture('longPress', { center, element: event.target });
            triggerHaptic('medium');
          }
        }
      }, adaptiveSensitivity.longPress);
    }
    
    if (onGestureStart) {
      onGestureStart({ type: 'start', touchPoints: touchData, center });
    }
    
  }, [isEnabled, getCenter, getDistance, getAngle, adaptiveSensitivity, executeGesture, triggerHaptic, onGestureStart]);

  // Handle pointer/touch move
  const handlePointerMove = useCallback((event) => {
    if (!isEnabled || !gestureStateRef.current.isActive) return;
    
    event.preventDefault();
    
    const touches = event.touches ? Array.from(event.touches) : [event];
    const touchData = touches.map(touch => ({
      id: touch.identifier || 'mouse',
      x: touch.clientX,
      y: touch.clientY,
      pressure: touch.force || 1,
      timestamp: Date.now()
    }));
    
    setTouchPoints(touchData);
    
    const center = getCenter(touchData);
    const now = Date.now();
    const { lastPosition, touchHistory, startTime } = gestureStateRef.current;
    
    // Calculate velocity
    const deltaTime = now - (touchHistory[touchHistory.length - 1]?.timestamp || startTime);
    const velocity = deltaTime > 0 ? {
      x: (center.x - lastPosition.x) / deltaTime * 1000,
      y: (center.y - lastPosition.y) / deltaTime * 1000
    } : { x: 0, y: 0 };
    
    // Update gesture state
    gestureStateRef.current.lastPosition = center;
    gestureStateRef.current.touchHistory = [
      ...touchHistory.slice(-9), // Keep last 10 positions
      { position: center, timestamp: now }
    ];
    
    // Calculate multi-touch metrics
    let scale = 1;
    let rotation = 0;
    
    if (touchData.length === 2) {
      const currentDistance = getDistance(touchData[0], touchData[1]);
      scale = currentDistance / gestureStateRef.current.initialDistance;
      
      const currentAngle = getAngle(touchData[0], touchData[1]);
      rotation = currentAngle - gestureStateRef.current.initialAngle;
    }
    
    // Update metrics
    setGestureMetrics({
      velocity,
      scale,
      rotation,
      center,
      pressure: touchData.reduce((sum, t) => sum + t.pressure, 0) / touchData.length
    });
    
    // Cancel long press if moved too much
    const distance = getDistance(gestureStateRef.current.startPosition, center);
    if (distance > adaptiveSensitivity.tap && timersRef.current.longPress) {
      clearTimeout(timersRef.current.longPress);
      timersRef.current.longPress = null;
    }
    
  }, [isEnabled, getCenter, getDistance, getAngle, adaptiveSensitivity.tap]);

  // Handle pointer/touch end
  const handlePointerEnd = useCallback((event) => {
    if (!isEnabled || !gestureStateRef.current.isActive) return;
    
    event.preventDefault();
    
    // Clear timers
    Object.values(timersRef.current).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    timersRef.current = { longPress: null, doubleTap: null, momentum: null };
    
    const { startPosition, lastPosition, startTime, touchHistory } = gestureStateRef.current;
    const endTime = Date.now();
    const duration = endTime - startTime;
    const distance = getDistance(startPosition, lastPosition);
    const center = lastPosition;
    
    // Determine gesture type
    let gestureType = null;
    let gestureParams = {};
    
    if (distance < adaptiveSensitivity.tap && duration < 300) {
      // Tap gesture
      const now = Date.now();
      const lastTapTime = gestureHistory.find(g => g.type === 'tap')?.timestamp || 0;
      
      if (now - lastTapTime < adaptiveSensitivity.doubleTap) {
        gestureType = 'doubleTap';
        triggerHaptic('double');
      } else {
        gestureType = 'tap';
        triggerHaptic('light');
        
        // Set timer for potential double tap
        timersRef.current.doubleTap = setTimeout(() => {
          // Execute tap if no double tap occurred
          if (gestureType === 'tap') {
            executeGesture('tap', { center, element: event.target });
          }
        }, adaptiveSensitivity.doubleTap);
        return; // Don't execute yet
      }
    } else if (distance >= adaptiveSensitivity.swipe) {
      // Swipe gesture
      const dx = lastPosition.x - startPosition.x;
      const dy = lastPosition.y - startPosition.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      
      if (absX > absY) {
        gestureType = dx > 0 ? 'swipeRight' : 'swipeLeft';
      } else {
        gestureType = dy > 0 ? 'swipeDown' : 'swipeUp';
      }
      
      // Add touch count prefix for multi-touch swipes
      const touchCount = touchPoints.length;
      if (touchCount === 2) {
        gestureType = 'twoFinger' + gestureType.charAt(0).toUpperCase() + gestureType.slice(1);
      } else if (touchCount === 3) {
        gestureType = 'threeFinger' + gestureType.charAt(0).toUpperCase() + gestureType.slice(1);
      }
      
      gestureParams = { distance, velocity: gestureMetrics.velocity, direction: { x: dx, y: dy } };
      triggerHaptic('medium');
    } else if (touchPoints.length === 2) {
      // Multi-touch gestures
      if (Math.abs(gestureMetrics.scale - 1) > adaptiveSensitivity.pinch) {
        gestureType = gestureMetrics.scale > 1 ? 'pinchOut' : 'pinchIn';
        gestureParams = { scale: gestureMetrics.scale, scaleDelta: gestureMetrics.scale - 1 };
        triggerHaptic('medium');
      } else if (Math.abs(gestureMetrics.rotation) > adaptiveSensitivity.rotation) {
        gestureType = 'rotate';
        gestureParams = { rotation: gestureMetrics.rotation };
        triggerHaptic('light');
      } else if (distance < adaptiveSensitivity.tap) {
        gestureType = 'twoFingerTap';
        triggerHaptic('double');
      }
    } else if (touchPoints.length === 3 && distance < adaptiveSensitivity.tap) {
      gestureType = 'threeFingerTap';
      triggerHaptic('triple');
    }
    
    // Execute gesture
    if (gestureType) {
      executeGesture(gestureType, { center, element: event.target }, gestureParams);
      
      // Apply momentum for swipe gestures if enabled
      if (enableMomentum && gestureType.includes('swipe') && gestureMetrics.velocity) {
        applyMomentum(gestureType, gestureParams);
      }
    }
    
    // Reset state
    gestureStateRef.current.isActive = false;
    setTouchPoints([]);
    setIsProcessing(false);
    
    if (onGestureEnd) {
      onGestureEnd({ 
        type: gestureType || 'unknown', 
        duration, 
        distance, 
        center,
        params: gestureParams 
      });
    }
    
  }, [
    isEnabled,
    adaptiveSensitivity,
    getDistance,
    gestureHistory,
    touchPoints,
    gestureMetrics,
    triggerHaptic,
    executeGesture,
    enableMomentum,
    onGestureEnd
  ]);

  // Apply momentum physics for smooth interactions
  const applyMomentum = useCallback((gestureType, params) => {
    if (!enableMomentum) return;
    
    const { velocity, direction } = params;
    if (!velocity || (Math.abs(velocity.x) < 100 && Math.abs(velocity.y) < 100)) return;
    
    const decay = 0.95;
    let currentVelocity = { ...velocity };
    
    const momentumStep = () => {
      const speed = Math.sqrt(currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y);
      
      if (speed > 50) {
        // Continue momentum-based action
        const momentumParams = {
          ...params,
          velocity: currentVelocity,
          momentum: true
        };
        
        if (onGesture) {
          onGesture({
            type: gestureType + 'Momentum',
            action: allGestures[gestureType]?.action,
            params: momentumParams,
            timestamp: Date.now()
          });
        }
        
        // Decay velocity
        currentVelocity.x *= decay;
        currentVelocity.y *= decay;
        
        timersRef.current.momentum = setTimeout(momentumStep, 16); // ~60fps
      }
    };
    
    momentumStep();
  }, [enableMomentum, onGesture, allGestures]);

  // Adaptive sensitivity based on user patterns
  useEffect(() => {
    if (!learningEnabled || gestureHistory.length < 10) return;
    
    const analyzePatterns = () => {
      const recentGestures = gestureHistory.slice(0, 20);
      const tapGestures = recentGestures.filter(g => g.type === 'tap');
      const swipeGestures = recentGestures.filter(g => g.type.includes('swipe'));
      
      // Adapt tap sensitivity based on user precision
      if (tapGestures.length > 5) {
        const avgTapPrecision = tapGestures.reduce((sum, g) => 
          sum + (g.metrics?.distance || 0), 0) / tapGestures.length;
        
        setAdaptiveSensitivity(prev => ({
          ...prev,
          tap: Math.max(5, Math.min(20, avgTapPrecision * 1.2))
        }));
      }
      
      // Adapt swipe sensitivity based on user gesture strength
      if (swipeGestures.length > 5) {
        const avgSwipeDistance = swipeGestures.reduce((sum, g) => 
          sum + (g.params?.distance || 0), 0) / swipeGestures.length;
        
        setAdaptiveSensitivity(prev => ({
          ...prev,
          swipe: Math.max(30, Math.min(100, avgSwipeDistance * 0.8))
        }));
      }
    };
    
    const analysisTimer = setTimeout(analyzePatterns, 5000);
    return () => clearTimeout(analysisTimer);
  }, [learningEnabled, gestureHistory]);

  // Event listener management
  useEffect(() => {
    if (!isEnabled) return;
    
    // Store event handlers for cleanup
    eventHandlersRef.current = {
      onPointerDown: handlePointerStart,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd
    };
    
    // No automatic event listeners - these will be attached by consumer
    
  }, [isEnabled, handlePointerStart, handlePointerMove, handlePointerEnd]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Public API
  return {
    // State
    isEnabled,
    activeGestures,
    touchPoints,
    gestureMetrics,
    currentContext,
    gestureHistory,
    isProcessing,
    adaptiveSensitivity,
    
    // Event handlers for consumer to attach
    eventHandlers: eventHandlersRef.current,
    
    // Manual gesture execution
    executeGesture,
    
    // Context management
    setContext: useCallback((context) => {
      setCurrentContext(context);
    }, []),
    
    // Configuration
    updateSensitivity: useCallback((newSensitivity) => {
      setAdaptiveSensitivity(prev => ({ ...prev, ...newSensitivity }));
    }, []),
    
    updateGestureMappings: useCallback((mappings) => {
      // This would update gesture mappings dynamically
    }, []),
    
    // Learning and preferences
    clearGestureHistory: useCallback(() => {
      setGestureHistory([]);
    }, []),
    
    resetSensitivity: useCallback(() => {
      setAdaptiveSensitivity(sensitivity);
    }, [sensitivity]),
    
    getUserPreferences: useCallback(() => {
      return {
        gesturePatterns: Array.from(gesturePatterns.entries()),
        adaptiveSensitivity,
        gestureHistory: gestureHistory.slice(0, 50) // Recent gestures only
      };
    }, [gesturePatterns, adaptiveSensitivity, gestureHistory]),
    
    // Utilities
    getGestureZone,
    
    // Haptic control
    vibrate: triggerHaptic,
    
    // Debug information
    getDebugInfo: useCallback(() => {
      return debugMode ? {
        gestureState: gestureStateRef.current,
        timers: timersRef.current,
        patterns: gesturePatterns,
        recentGestures: gestureHistory.slice(0, 10)
      } : null;
    }, [debugMode, gesturePatterns, gestureHistory])
  };
};

export default useGestureControls;