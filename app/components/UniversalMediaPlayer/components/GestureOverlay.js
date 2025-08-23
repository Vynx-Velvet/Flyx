import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * GestureOverlay - Advanced gesture recognition system for intuitive media control
 * 
 * Features:
 * - Multi-touch gesture recognition (tap, double-tap, long press, swipe, pinch)
 * - Customizable gesture mappings and sensitivity settings
 * - Visual feedback with ripple effects and gesture indicators
 * - Velocity-based seeking with momentum physics
 * - Context-aware gestures (different actions based on location)
 * - Accessibility integration with haptic feedback
 * - Performance-optimized touch handling
 * - Gesture learning and adaptation to user patterns
 */
const GestureOverlay = ({
  isEnabled = true,
  gestureMappings = {},
  sensitivity = {
    tap: 10,
    swipe: 50,
    pinch: 0.1,
    longPress: 500
  },
  visualFeedback = true,
  hapticFeedback = true,
  onGesture = null,
  contextZones = {},
  videoRef = null,
  playerState = {},
  accessibility = {
    announceGestures: false,
    largeTargets: false
  }
}) => {
  const [activeGestures, setActiveGestures] = useState([]);
  const [touchPoints, setTouchPoints] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [gestureHints, setGestureHints] = useState([]);
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  const [lastGestureTime, setLastGestureTime] = useState(0);

  const overlayRef = useRef(null);
  const gestureStateRef = useRef({
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    distance: 0,
    scale: 1,
    rotation: 0,
    touches: [],
    isTracking: false
  });
  
  const longPressTimerRef = useRef(null);
  const momentumTimerRef = useRef(null);
  const gestureHistoryRef = useRef([]);

  // Default gesture mappings
  const defaultGestures = useMemo(() => ({
    // Single touch gestures
    tap: { action: 'togglePlayPause', zones: ['center'] },
    doubleTap: { action: 'toggleFullscreen', zones: ['center'] },
    longPress: { action: 'showContextMenu', zones: ['anywhere'] },
    
    // Swipe gestures
    swipeLeft: { action: 'seekBackward', zones: ['anywhere'], params: { seconds: 10 } },
    swipeRight: { action: 'seekForward', zones: ['anywhere'], params: { seconds: 10 } },
    swipeUp: { action: 'volumeUp', zones: ['right'], params: { amount: 0.1 } },
    swipeDown: { action: 'volumeDown', zones: ['right'], params: { amount: 0.1 } },
    
    // Multi-touch gestures
    pinchIn: { action: 'zoomOut', zones: ['anywhere'] },
    pinchOut: { action: 'zoomIn', zones: ['anywhere'] },
    twoFingerTap: { action: 'showSettings', zones: ['anywhere'] },
    
    // Edge gestures
    edgeSwipeLeft: { action: 'previousEpisode', zones: ['leftEdge'] },
    edgeSwipeRight: { action: 'nextEpisode', zones: ['rightEdge'] },
    edgeSwipeUp: { action: 'showPlaylist', zones: ['bottomEdge'] },
    edgeSwipeDown: { action: 'hideControls', zones: ['topEdge'] }
  }), []);

  // Merge default and custom gesture mappings
  const allGestures = useMemo(() => ({
    ...defaultGestures,
    ...gestureMappings
  }), [defaultGestures, gestureMappings]);

  // Context zones for location-aware gestures
  const defaultZones = useMemo(() => ({
    center: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
    left: { x: 0, y: 0, width: 0.3, height: 1 },
    right: { x: 0.7, y: 0, width: 0.3, height: 1 },
    top: { x: 0, y: 0, width: 1, height: 0.3 },
    bottom: { x: 0, y: 0.7, width: 1, height: 0.3 },
    leftEdge: { x: 0, y: 0, width: 0.05, height: 1 },
    rightEdge: { x: 0.95, y: 0, width: 0.05, height: 1 },
    topEdge: { x: 0, y: 0, width: 1, height: 0.05 },
    bottomEdge: { x: 0, y: 0.95, width: 1, height: 0.05 }
  }), []);

  const zones = useMemo(() => ({
    ...defaultZones,
    ...contextZones
  }), [defaultZones, contextZones]);

  // Get zone from touch position
  const getTouchZone = useCallback((x, y, containerWidth, containerHeight) => {
    const relativeX = x / containerWidth;
    const relativeY = y / containerHeight;
    
    for (const [zoneName, zone] of Object.entries(zones)) {
      if (relativeX >= zone.x && relativeX <= zone.x + zone.width &&
          relativeY >= zone.y && relativeY <= zone.y + zone.height) {
        return zoneName;
      }
    }
    
    return 'anywhere';
  }, [zones]);

  // Calculate distance between two points
  const getDistance = useCallback((p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate velocity
  const getVelocity = useCallback((currentPos, startPos, deltaTime) => {
    if (deltaTime === 0) return { x: 0, y: 0 };
    
    return {
      x: (currentPos.x - startPos.x) / deltaTime,
      y: (currentPos.y - startPos.y) / deltaTime
    };
  }, []);

  // Create ripple effect
  const createRipple = useCallback((x, y, type = 'tap') => {
    if (!visualFeedback) return;
    
    const ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
      type,
      timestamp: Date.now()
    };
    
    setRipples(prev => [...prev, ripple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 1000);
  }, [visualFeedback]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((type = 'light') => {
    if (!hapticFeedback || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50],
      success: [10, 50, 10],
      error: [100, 50, 100]
    };
    
    navigator.vibrate(patterns[type] || patterns.light);
  }, [hapticFeedback]);

  // Execute gesture action
  const executeGesture = useCallback((gestureType, touchInfo, params = {}) => {
    const gesture = allGestures[gestureType];
    if (!gesture) return false;
    
    // Check zone compatibility
    const touchZone = getTouchZone(
      touchInfo.x, 
      touchInfo.y, 
      overlayRef.current?.offsetWidth || 1, 
      overlayRef.current?.offsetHeight || 1
    );
    
    if (gesture.zones && !gesture.zones.includes(touchZone) && !gesture.zones.includes('anywhere')) {
      return false;
    }
    
    // Create gesture event
    const gestureEvent = {
      type: gestureType,
      action: gesture.action,
      position: touchInfo,
      zone: touchZone,
      params: { ...gesture.params, ...params },
      timestamp: Date.now(),
      velocity: gestureStateRef.current.velocity
    };
    
    // Add to gesture history for learning
    gestureHistoryRef.current = [
      gestureEvent,
      ...gestureHistoryRef.current.slice(0, 99)
    ];
    
    setLastGestureTime(Date.now());
    
    // Visual feedback
    createRipple(touchInfo.x, touchInfo.y, gestureType);
    triggerHaptic('light');
    
    // Accessibility announcement
    if (accessibility.announceGestures) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.textContent = `Gesture: ${gestureType}, Action: ${gesture.action}`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    }
    
    // Execute callback
    if (onGesture) {
      onGesture(gestureEvent);
    }
    
    return true;
  }, [
    allGestures, 
    getTouchZone, 
    createRipple, 
    triggerHaptic, 
    accessibility.announceGestures, 
    onGesture
  ]);

  // Handle touch start
  const handleTouchStart = useCallback((event) => {
    if (!isEnabled) return;
    
    event.preventDefault();
    
    const touches = Array.from(event.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX - overlayRef.current.getBoundingClientRect().left,
      y: touch.clientY - overlayRef.current.getBoundingClientRect().top,
      force: touch.force || 1
    }));
    
    setTouchPoints(touches);
    setIsMultiTouch(touches.length > 1);
    
    const primaryTouch = touches[0];
    
    gestureStateRef.current = {
      startTime: Date.now(),
      startPosition: { x: primaryTouch.x, y: primaryTouch.y },
      currentPosition: { x: primaryTouch.x, y: primaryTouch.y },
      velocity: { x: 0, y: 0 },
      distance: 0,
      scale: 1,
      rotation: 0,
      touches,
      isTracking: true
    };
    
    // Start long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    longPressTimerRef.current = setTimeout(() => {
      if (gestureStateRef.current.isTracking && gestureStateRef.current.distance < sensitivity.tap) {
        executeGesture('longPress', primaryTouch);
        triggerHaptic('medium');
      }
    }, sensitivity.longPress);
    
  }, [isEnabled, sensitivity.tap, sensitivity.longPress, executeGesture, triggerHaptic]);

  // Handle touch move
  const handleTouchMove = useCallback((event) => {
    if (!isEnabled || !gestureStateRef.current.isTracking) return;
    
    event.preventDefault();
    
    const touches = Array.from(event.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX - overlayRef.current.getBoundingClientRect().left,
      y: touch.clientY - overlayRef.current.getBoundingClientRect().top,
      force: touch.force || 1
    }));
    
    setTouchPoints(touches);
    
    const primaryTouch = touches[0];
    const currentTime = Date.now();
    const deltaTime = currentTime - gestureStateRef.current.startTime;
    
    // Update gesture state
    gestureStateRef.current.currentPosition = { x: primaryTouch.x, y: primaryTouch.y };
    gestureStateRef.current.distance = getDistance(
      gestureStateRef.current.startPosition,
      gestureStateRef.current.currentPosition
    );
    gestureStateRef.current.velocity = getVelocity(
      gestureStateRef.current.currentPosition,
      gestureStateRef.current.startPosition,
      deltaTime
    );
    gestureStateRef.current.touches = touches;
    
    // Handle multi-touch gestures
    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = getDistance(touch1, touch2);
      
      // Initialize scale on first multi-touch
      if (gestureStateRef.current.initialDistance === undefined) {
        gestureStateRef.current.initialDistance = currentDistance;
        gestureStateRef.current.scale = 1;
      } else {
        gestureStateRef.current.scale = currentDistance / gestureStateRef.current.initialDistance;
      }
      
      // Detect pinch gestures
      const scaleChange = Math.abs(gestureStateRef.current.scale - 1);
      if (scaleChange > sensitivity.pinch) {
        const gestureType = gestureStateRef.current.scale > 1 ? 'pinchOut' : 'pinchIn';
        const centerPoint = {
          x: (touch1.x + touch2.x) / 2,
          y: (touch1.y + touch2.y) / 2
        };
        
        executeGesture(gestureType, centerPoint, {
          scale: gestureStateRef.current.scale,
          scaleDelta: gestureStateRef.current.scale - 1
        });
      }
    }
    
    // Cancel long press if moved too much
    if (gestureStateRef.current.distance > sensitivity.tap && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
  }, [isEnabled, getDistance, getVelocity, sensitivity.tap, sensitivity.pinch, executeGesture]);

  // Handle touch end
  const handleTouchEnd = useCallback((event) => {
    if (!isEnabled || !gestureStateRef.current.isTracking) return;
    
    event.preventDefault();
    
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const { startPosition, currentPosition, distance, velocity } = gestureStateRef.current;
    const deltaTime = Date.now() - gestureStateRef.current.startTime;
    
    // Handle tap gestures
    if (distance < sensitivity.tap && deltaTime < 300) {
      const now = Date.now();
      const isDoubleTap = now - lastGestureTime < 300;
      
      if (isDoubleTap) {
        executeGesture('doubleTap', startPosition);
        triggerHaptic('medium');
      } else {
        // Wait to see if this becomes a double tap
        setTimeout(() => {
          if (Date.now() - now > 250) {
            executeGesture('tap', startPosition);
            triggerHaptic('light');
          }
        }, 250);
      }
    }
    // Handle swipe gestures
    else if (distance > sensitivity.swipe) {
      const dx = currentPosition.x - startPosition.x;
      const dy = currentPosition.y - startPosition.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      
      let gestureType = '';
      
      if (absX > absY) {
        gestureType = dx > 0 ? 'swipeRight' : 'swipeLeft';
      } else {
        gestureType = dy > 0 ? 'swipeDown' : 'swipeUp';
      }
      
      // Check for edge swipes
      const touchZone = getTouchZone(
        startPosition.x,
        startPosition.y,
        overlayRef.current?.offsetWidth || 1,
        overlayRef.current?.offsetHeight || 1
      );
      
      if (touchZone.includes('Edge')) {
        gestureType = 'edge' + gestureType.charAt(0).toUpperCase() + gestureType.slice(1);
      }
      
      executeGesture(gestureType, startPosition, {
        distance,
        velocity: Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y),
        direction: { x: dx, y: dy }
      });
      
      triggerHaptic('light');
      
      // Apply momentum for seeking gestures
      if (gestureType.includes('swipeLeft') || gestureType.includes('swipeRight')) {
        const momentumDecay = 0.95;
        let currentVelocity = Math.abs(velocity.x);
        
        const applyMomentum = () => {
          if (currentVelocity > 10) {
            currentVelocity *= momentumDecay;
            
            // Continue seeking with momentum
            const seekAmount = (currentVelocity / 1000) * (dx > 0 ? 1 : -1);
            executeGesture(gestureType, startPosition, {
              momentum: true,
              seekAmount
            });
            
            momentumTimerRef.current = setTimeout(applyMomentum, 16); // ~60fps
          }
        };
        
        if (Math.abs(velocity.x) > 100) {
          applyMomentum();
        }
      }
    }
    
    // Handle multi-touch end
    if (event.touches.length === 0 && gestureStateRef.current.touches.length === 2) {
      executeGesture('twoFingerTap', {
        x: (gestureStateRef.current.touches[0].x + gestureStateRef.current.touches[1].x) / 2,
        y: (gestureStateRef.current.touches[0].y + gestureStateRef.current.touches[1].y) / 2
      });
    }
    
    // Reset gesture state
    gestureStateRef.current.isTracking = false;
    setTouchPoints([]);
    setIsMultiTouch(false);
    
  }, [
    isEnabled,
    sensitivity.tap,
    sensitivity.swipe,
    lastGestureTime,
    executeGesture,
    triggerHaptic,
    getTouchZone
  ]);

  // Mouse event handling for desktop
  const handleMouseDown = useCallback((event) => {
    if (!isEnabled || event.touches) return; // Ignore if touch is also present
    
    const mouseTouch = {
      id: 'mouse',
      x: event.clientX - overlayRef.current.getBoundingClientRect().left,
      y: event.clientY - overlayRef.current.getBoundingClientRect().top,
      force: 1
    };
    
    handleTouchStart({ touches: [mouseTouch], preventDefault: () => {} });
  }, [isEnabled, handleTouchStart]);

  const handleMouseMove = useCallback((event) => {
    if (!isEnabled || !gestureStateRef.current.isTracking || event.touches) return;
    
    const mouseTouch = {
      id: 'mouse',
      x: event.clientX - overlayRef.current.getBoundingClientRect().left,
      y: event.clientY - overlayRef.current.getBoundingClientRect().top,
      force: 1
    };
    
    handleTouchMove({ touches: [mouseTouch], preventDefault: () => {} });
  }, [isEnabled, handleTouchMove]);

  const handleMouseUp = useCallback((event) => {
    if (!isEnabled || !gestureStateRef.current.isTracking || event.touches) return;
    
    handleTouchEnd({ touches: [], preventDefault: () => {} });
  }, [isEnabled, handleTouchEnd]);

  // Keyboard gesture support
  useEffect(() => {
    if (!isEnabled) return;
    
    const handleKeyDown = (event) => {
      // Map keyboard shortcuts to gestures
      const keyGestureMap = {
        'Space': () => executeGesture('tap', { x: 0, y: 0 }),
        'ArrowLeft': () => executeGesture('swipeLeft', { x: 0, y: 0 }),
        'ArrowRight': () => executeGesture('swipeRight', { x: 0, y: 0 }),
        'ArrowUp': () => executeGesture('swipeUp', { x: 0, y: 0 }),
        'ArrowDown': () => executeGesture('swipeDown', { x: 0, y: 0 }),
        'Enter': () => executeGesture('doubleTap', { x: 0, y: 0 })
      };
      
      if (keyGestureMap[event.code] && !event.repeat) {
        event.preventDefault();
        keyGestureMap[event.code]();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, executeGesture]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (momentumTimerRef.current) {
        clearTimeout(momentumTimerRef.current);
      }
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <div
      ref={overlayRef}
      className={styles.gestureOverlay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {/* Touch points visualization */}
      {visualFeedback && touchPoints.map(touch => (
        <motion.div
          key={touch.id}
          className={styles.touchPoint}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            left: touch.x - 20,
            top: touch.y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `rgba(100, 150, 255, ${touch.force})`,
            pointerEvents: 'none',
            mixBlendMode: 'screen'
          }}
        />
      ))}
      
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className={styles.ripple}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: ripple.x - 25,
              top: ripple.y - 25,
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: ripple.type === 'tap' 
                ? '2px solid rgba(100, 255, 150, 0.6)' 
                : '2px solid rgba(255, 100, 150, 0.6)',
              pointerEvents: 'none'
            }}
          />
        ))}
      </AnimatePresence>
      
      {/* Multi-touch connection line */}
      {isMultiTouch && touchPoints.length === 2 && visualFeedback && (
        <motion.svg
          className={styles.multiTouchLine}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
        >
          <line
            x1={touchPoints[0].x}
            y1={touchPoints[0].y}
            x2={touchPoints[1].x}
            y2={touchPoints[1].y}
            stroke="rgba(100, 150, 255, 0.6)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        </motion.svg>
      )}
      
      {/* Gesture zones visualization (debug mode) - DISABLED to prevent text overlay */}
      {false && process.env.NODE_ENV === 'development' && (
        <div className={styles.gestureZones}>
          {Object.entries(zones).map(([zoneName, zone]) => (
            <div
              key={zoneName}
              className={styles.gestureZone}
              style={{
                position: 'absolute',
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.width * 100}%`,
                height: `${zone.height * 100}%`,
                border: '1px dashed rgba(255, 255, 255, 0.3)',
                pointerEvents: 'none',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {zoneName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GestureOverlay;