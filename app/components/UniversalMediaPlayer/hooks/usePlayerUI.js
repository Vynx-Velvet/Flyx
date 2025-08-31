'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing player UI state and interactions
 * Handles visibility, fullscreen, settings, and user interactions
 */
export const usePlayerUI = ({
  onFullscreenChange,
  onSettingsToggle,
  onEpisodeCarouselToggle
}) => {
  // UI visibility state
  const [uiState, setUiState] = useState({
    isVisible: true,
    settingsVisible: false,
    performanceVisible: false,
    episodeCarouselVisible: false,
    resumeDialogVisible: false
  });

  // Fullscreen state
  const [fullscreenState, setFullscreenState] = useState({
    isFullscreen: false,
    mode: 'standard' // 'standard', 'immersive', 'cinema'
  });

  // Log initial state
  console.log('🎛️ UI: Initial UI state:', uiState);
  console.log('🎛️ UI: Initial fullscreen state:', fullscreenState);

  // Refs for UI management
  const uiTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // UI visibility management
  const showUI = useCallback(() => {
    console.log('🎛️ UI: Showing UI');
    setUiState(prev => ({ ...prev, isVisible: true }));

    // Clear existing timeout
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current);
    }

    // Hide after 3 seconds of inactivity (only in immersive mode)
    if (fullscreenState.mode === 'immersive') {
      console.log('🎛️ UI: Setting timeout to hide UI in immersive mode');
      uiTimeoutRef.current = setTimeout(() => {
        console.log('🎛️ UI: Hiding UI due to timeout');
        setUiState(prev => ({ ...prev, isVisible: false }));
      }, 3000);
    }
  }, [fullscreenState.mode]);

  const hideUI = useCallback(() => {
    console.log('🎛️ UI: hideUI called, mode:', fullscreenState.mode);
    if (fullscreenState.mode === 'immersive') {
      console.log('🎛️ UI: Hiding UI in immersive mode');
      setUiState(prev => ({ ...prev, isVisible: false }));
    } else {
      console.log('🎛️ UI: Not hiding UI (not in immersive mode)');
    }
  }, [fullscreenState.mode]);

  const toggleUI = useCallback(() => {
    setUiState(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }, []);

  // Settings management
  const toggleSettings = useCallback(() => {
    setUiState(prev => {
      const newSettingsVisible = !prev.settingsVisible;
      onSettingsToggle?.(newSettingsVisible);
      return { ...prev, settingsVisible: newSettingsVisible };
    });
  }, [onSettingsToggle]);

  const closeSettings = useCallback(() => {
    setUiState(prev => ({ ...prev, settingsVisible: false }));
    onSettingsToggle?.(false);
  }, [onSettingsToggle]);

  // Performance dashboard
  const togglePerformance = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      performanceVisible: !prev.performanceVisible
    }));
  }, []);

  const closePerformance = useCallback(() => {
    setUiState(prev => ({ ...prev, performanceVisible: false }));
  }, []);

  // Episode carousel
  const toggleEpisodeCarousel = useCallback(() => {
    setUiState(prev => {
      const newVisible = !prev.episodeCarouselVisible;
      onEpisodeCarouselToggle?.(newVisible);
      return { ...prev, episodeCarouselVisible: newVisible };
    });
  }, [onEpisodeCarouselToggle]);

  const closeEpisodeCarousel = useCallback(() => {
    setUiState(prev => ({ ...prev, episodeCarouselVisible: false }));
    onEpisodeCarouselToggle?.(false);
  }, [onEpisodeCarouselToggle]);

  // Resume dialog
  const showResumeDialog = useCallback(() => {
    setUiState(prev => ({ ...prev, resumeDialogVisible: true }));
  }, []);

  const hideResumeDialog = useCallback(() => {
    setUiState(prev => ({ ...prev, resumeDialogVisible: false }));
  }, []);

  // Fullscreen management
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setFullscreenState({
          isFullscreen: true,
          mode: 'immersive'
        });
        onFullscreenChange?.(true);
      } else {
        await document.exitFullscreen();
        setFullscreenState({
          isFullscreen: false,
          mode: 'standard'
        });
        onFullscreenChange?.(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [onFullscreenChange]);

  const setFullscreenMode = useCallback((mode) => {
    setFullscreenState(prev => ({ ...prev, mode }));
  }, []);

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e, playerActions) => {
    if (e.target.tagName === 'INPUT' || !playerActions) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        playerActions.togglePlay?.();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        playerActions.toggleMute?.();
        break;
      case 's':
      case 'S':
        e.preventDefault();
        toggleSettings();
        break;
      case 'e':
      case 'E':
        e.preventDefault();
        toggleEpisodeCarousel();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        playerActions.seek?.(Math.max(0, playerActions.currentTime - 10));
        break;
      case 'ArrowRight':
        e.preventDefault();
        playerActions.seek?.(playerActions.currentTime + 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        playerActions.adjustVolume?.(0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        playerActions.adjustVolume?.(-0.1);
        break;
      case ',':
        e.preventDefault();
        playerActions.setPlaybackRate?.(playerActions.playbackRate - 0.25);
        break;
      case '.':
        e.preventDefault();
        playerActions.setPlaybackRate?.(playerActions.playbackRate + 0.25);
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          e.preventDefault();
          toggleFullscreen();
        }
        break;
      default:
        break;
    }
  }, [toggleFullscreen, toggleSettings, toggleEpisodeCarousel]);

  // Setup keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // We'll need to pass playerActions when calling this
      // For now, just handle fullscreen escape
      if (e.key === 'Escape' && document.fullscreenElement) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setFullscreenState(prev => ({
        ...prev,
        isFullscreen
      }));
      onFullscreenChange?.(isFullscreen);

      // Auto-hide UI in fullscreen
      if (isFullscreen) {
        setFullscreenState(prev => ({ ...prev, mode: 'immersive' }));
      } else {
        setFullscreenState(prev => ({ ...prev, mode: 'standard' }));
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (uiTimeoutRef.current) {
        clearTimeout(uiTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Refs
    containerRef,

    // State
    uiState,
    fullscreenState,

    // UI visibility
    showUI,
    hideUI,
    toggleUI,

    // Settings
    toggleSettings,
    closeSettings,

    // Performance
    togglePerformance,
    closePerformance,

    // Episode carousel
    toggleEpisodeCarousel,
    closeEpisodeCarousel,

    // Resume dialog
    showResumeDialog,
    hideResumeDialog,

    // Fullscreen
    toggleFullscreen,
    setFullscreenMode,

    // Keyboard
    handleKeyPress
  };
};

export default usePlayerUI;