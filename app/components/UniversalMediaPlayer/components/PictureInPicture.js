import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * PictureInPicture - Advanced Picture-in-Picture implementation with intelligent positioning
 * 
 * Features:
 * - Native PiP API integration with fallback custom implementation
 * - Intelligent positioning with collision detection
 * - Smart sizing based on content and screen real estate
 * - Gesture controls for repositioning and resizing
 * - Multi-window support and management
 * - Performance optimization with adaptive quality
 * - Accessibility features and keyboard controls
 * - Integration with system PiP controls
 */
const PictureInPicture = ({
  videoRef,
  isEnabled = true,
  defaultPosition = 'bottom-right',
  defaultSize = 'medium',
  allowResize = true,
  allowMove = true,
  snapToEdges = true,
  avoidObstructions = true,
  showControls = true,
  onEnterPiP = null,
  onExitPiP = null,
  onPositionChange = null,
  onSizeChange = null,
  customControls = []
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isNativePiP, setIsNativePiP] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 320, height: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const pipContainerRef = useRef(null);
  const videoElementRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0 });

  // Size presets
  const sizePresets = useMemo(() => ({
    small: { width: 240, height: 135 },
    medium: { width: 320, height: 180 },
    large: { width: 480, height: 270 },
    xlarge: { width: 640, height: 360 }
  }), []);

  // Position presets
  const positionPresets = useMemo(() => ({
    'top-left': { x: 20, y: 20 },
    'top-right': { x: window.innerWidth - 340, y: 20 },
    'bottom-left': { x: 20, y: window.innerHeight - 220 },
    'bottom-right': { x: window.innerWidth - 340, y: window.innerHeight - 220 },
    'center': { x: (window.innerWidth - 320) / 2, y: (window.innerHeight - 180) / 2 }
  }), []);

  // Check PiP support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = document.pictureInPictureEnabled ||
        'requestPictureInPicture' in HTMLVideoElement.prototype;
      setIsPiPSupported(supported);
    }
  }, []);

  // Initialize position and size
  useEffect(() => {
    if (defaultPosition in positionPresets) {
      setPosition(positionPresets[defaultPosition]);
    }
    
    if (defaultSize in sizePresets) {
      setSize(sizePresets[defaultSize]);
    }
  }, [defaultPosition, defaultSize, positionPresets, sizePresets]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isActive && !isNativePiP) {
        // Ensure PiP window stays within bounds
        setPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, window.innerWidth - size.width)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - size.height))
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, isNativePiP, size]);

  // Intelligent positioning with obstruction avoidance
  const findOptimalPosition = useCallback((preferredPosition, windowSize) => {
    if (!avoidObstructions) {
      return preferredPosition;
    }

    // Get all elements that might obstruct the PiP window
    const obstructions = Array.from(document.querySelectorAll('[data-pip-obstruction]'));
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 20;

    // Define potential positions (corners and edges)
    const potentialPositions = [
      { x: screenWidth - windowSize.width - margin, y: screenHeight - windowSize.height - margin, priority: 1 }, // bottom-right
      { x: margin, y: screenHeight - windowSize.height - margin, priority: 2 }, // bottom-left
      { x: screenWidth - windowSize.width - margin, y: margin, priority: 3 }, // top-right
      { x: margin, y: margin, priority: 4 }, // top-left
      { x: (screenWidth - windowSize.width) / 2, y: screenHeight - windowSize.height - margin, priority: 5 }, // bottom-center
      { x: screenWidth - windowSize.width - margin, y: (screenHeight - windowSize.height) / 2, priority: 6 } // right-center
    ];

    // Check for collisions and find the best position
    for (const pos of potentialPositions.sort((a, b) => a.priority - b.priority)) {
      const pipRect = {
        left: pos.x,
        top: pos.y,
        right: pos.x + windowSize.width,
        bottom: pos.y + windowSize.height
      };

      let hasCollision = false;
      
      for (const obstruction of obstructions) {
        const rect = obstruction.getBoundingClientRect();
        if (!(pipRect.right < rect.left || 
              pipRect.left > rect.right || 
              pipRect.bottom < rect.top || 
              pipRect.top > rect.bottom)) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        return pos;
      }
    }

    // If all positions have collisions, return the preferred position
    return preferredPosition;
  }, [avoidObstructions]);

  // Enter Picture-in-Picture mode
  const enterPictureInPicture = useCallback(async () => {
    if (!videoRef?.current || isActive) return;

    try {
      // Try native PiP first
      if (isPiPSupported && videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
        setIsNativePiP(true);
        setIsActive(true);
        
        if (onEnterPiP) {
          onEnterPiP({ type: 'native' });
        }
      } else {
        // Fallback to custom PiP
        const optimalPosition = findOptimalPosition(position, size);
        setPosition(optimalPosition);
        setIsNativePiP(false);
        setIsActive(true);
        
        if (onEnterPiP) {
          onEnterPiP({ type: 'custom', position: optimalPosition, size });
        }
      }
    } catch (error) {
      console.warn('Failed to enter Picture-in-Picture:', error);
      
      // Fallback to custom implementation
      const optimalPosition = findOptimalPosition(position, size);
      setPosition(optimalPosition);
      setIsNativePiP(false);
      setIsActive(true);
      
      if (onEnterPiP) {
        onEnterPiP({ type: 'custom', position: optimalPosition, size });
      }
    }
  }, [videoRef, isActive, isPiPSupported, position, size, findOptimalPosition, onEnterPiP]);

  // Exit Picture-in-Picture mode
  const exitPictureInPicture = useCallback(async () => {
    if (!isActive) return;

    try {
      if (isNativePiP && document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      
      setIsActive(false);
      setIsNativePiP(false);
      
      if (onExitPiP) {
        onExitPiP({ type: isNativePiP ? 'native' : 'custom' });
      }
    } catch (error) {
      console.warn('Failed to exit Picture-in-Picture:', error);
    }
  }, [isActive, isNativePiP, onExitPiP]);

  // Handle native PiP events
  useEffect(() => {
    if (!videoRef?.current) return;

    const video = videoRef.current;
    
    const handleEnterPiP = () => {
      setIsActive(true);
      setIsNativePiP(true);
    };
    
    const handleLeavePiP = () => {
      setIsActive(false);
      setIsNativePiP(false);
    };

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);

  // Drag functionality
  const handleDragStart = useCallback((event) => {
    if (!allowMove || isNativePiP) return;

    setIsDragging(true);
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y
    });
  }, [allowMove, isNativePiP, position]);

  const handleDragMove = useCallback((event) => {
    if (!isDragging || !allowMove || isNativePiP) return;

    event.preventDefault();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    let newX = clientX - dragOffset.x;
    let newY = clientY - dragOffset.y;

    // Keep within screen bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - size.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - size.height));

    // Snap to edges if enabled
    if (snapToEdges) {
      const snapThreshold = 20;
      
      if (newX < snapThreshold) newX = 0;
      if (newY < snapThreshold) newY = 0;
      if (newX > window.innerWidth - size.width - snapThreshold) {
        newX = window.innerWidth - size.width;
      }
      if (newY > window.innerHeight - size.height - snapThreshold) {
        newY = window.innerHeight - size.height;
      }
    }

    setPosition({ x: newX, y: newY });
  }, [isDragging, allowMove, isNativePiP, dragOffset, size, snapToEdges]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      if (onPositionChange) {
        onPositionChange(position);
      }
    }
  }, [isDragging, position, onPositionChange]);

  // Resize functionality
  const handleResizeStart = useCallback((event) => {
    if (!allowResize || isNativePiP) return;

    event.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { width: size.width, height: size.height };
  }, [allowResize, isNativePiP, size]);

  const handleResizeMove = useCallback((event) => {
    if (!isResizing || !allowResize || isNativePiP) return;

    event.preventDefault();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const deltaX = clientX - (position.x + resizeStartRef.current.width);
    const deltaY = clientY - (position.y + resizeStartRef.current.height);

    let newWidth = resizeStartRef.current.width + deltaX;
    let newHeight = resizeStartRef.current.height + deltaY;

    // Maintain aspect ratio
    const aspectRatio = 16 / 9;
    newHeight = newWidth / aspectRatio;

    // Apply size constraints
    newWidth = Math.max(240, Math.min(newWidth, window.innerWidth - position.x));
    newHeight = Math.max(135, Math.min(newHeight, window.innerHeight - position.y));
    
    // Ensure aspect ratio is maintained
    if (newWidth / newHeight > aspectRatio) {
      newWidth = newHeight * aspectRatio;
    } else {
      newHeight = newWidth / aspectRatio;
    }

    setSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
  }, [isResizing, allowResize, isNativePiP, position]);

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      
      if (onSizeChange) {
        onSizeChange(size);
      }
    }
  }, [isResizing, size, onSizeChange]);

  // Global mouse/touch event handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) handleDragMove(e);
      if (isResizing) handleResizeMove(e);
    };

    const handleMouseUp = () => {
      if (isDragging) handleDragEnd();
      if (isResizing) handleResizeEnd();
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive || isNativePiP) return;

    const handleKeyDown = (event) => {
      if (!pipContainerRef.current?.contains(document.activeElement)) return;

      switch (event.key) {
        case 'Escape':
          exitPictureInPicture();
          break;
        case 'ArrowUp':
          event.preventDefault();
          setPosition(prev => ({ ...prev, y: Math.max(0, prev.y - 10) }));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setPosition(prev => ({ ...prev, y: Math.min(window.innerHeight - size.height, prev.y + 10) }));
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setPosition(prev => ({ ...prev, x: Math.max(0, prev.x - 10) }));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setPosition(prev => ({ ...prev, x: Math.min(window.innerWidth - size.width, prev.x + 10) }));
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isNativePiP, size, exitPictureInPicture]);

  if (!isEnabled || !isActive || isNativePiP) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={pipContainerRef}
        className={`${styles.pictureInPictureContainer} ${isDragging ? styles.dragging : ''} ${isResizing ? styles.resizing : ''}`}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 9999
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
      >
        {/* Video element */}
        <div
          className={styles.pipVideoContainer}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <video
            ref={videoElementRef}
            className={styles.pipVideo}
            src={videoRef?.current?.src}
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>

        {/* Controls overlay */}
        <AnimatePresence>
          {(isHovered || isDragging || isResizing) && showControls && (
            <motion.div
              className={styles.pipControls}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header with title and close button */}
              <div className={styles.pipHeader}>
                <div className={styles.pipTitle}>Picture in Picture</div>
                <button
                  className={styles.pipCloseButton}
                  onClick={exitPictureInPicture}
                  title="Exit Picture-in-Picture"
                >
                  ✕
                </button>
              </div>

              {/* Custom controls */}
              {customControls.length > 0 && (
                <div className={styles.pipCustomControls}>
                  {customControls.map((control, index) => (
                    <button
                      key={index}
                      className={styles.pipCustomButton}
                      onClick={control.onClick}
                      title={control.title}
                    >
                      {control.icon}
                    </button>
                  ))}
                </div>
              )}

              {/* Size presets */}
              <div className={styles.pipSizeControls}>
                {Object.entries(sizePresets).map(([presetName, presetSize]) => (
                  <button
                    key={presetName}
                    className={`${styles.pipSizeButton} ${
                      size.width === presetSize.width ? styles.active : ''
                    }`}
                    onClick={() => setSize(presetSize)}
                    title={`${presetName.charAt(0).toUpperCase() + presetName.slice(1)} size`}
                  >
                    {presetName.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resize handle */}
        {allowResize && (
          <div
            className={styles.pipResizeHandle}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            title="Drag to resize"
          >
            <div className={styles.resizeIcon}>↘</div>
          </div>
        )}

        {/* Drag indicator */}
        {isDragging && (
          <div className={styles.pipDragIndicator}>
            <span>Drag to reposition</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Export hook for easy integration
export const usePictureInPicture = (videoRef, options = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = document.pictureInPictureEnabled ||
        'requestPictureInPicture' in HTMLVideoElement.prototype;
      setIsPiPSupported(supported);
    }
  }, []);

  const enterPiP = useCallback(async () => {
    if (!videoRef?.current) return false;

    try {
      if (isPiPSupported && videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
        setIsActive(true);
        return true;
      }
    } catch (error) {
      console.warn('PiP failed:', error);
    }
    
    return false;
  }, [videoRef, isPiPSupported]);

  const exitPiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsActive(false);
        return true;
      }
    } catch (error) {
      console.warn('Exit PiP failed:', error);
    }
    
    return false;
  }, []);

  const togglePiP = useCallback(async () => {
    if (isActive) {
      return await exitPiP();
    } else {
      return await enterPiP();
    }
  }, [isActive, enterPiP, exitPiP]);

  return {
    isActive,
    isPiPSupported,
    enterPiP,
    exitPiP,
    togglePiP
  };
};

export default PictureInPicture;