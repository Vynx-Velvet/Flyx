/**
 * Auto-Advance Hook
 * Handles automatic episode advancement and next episode prompts
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const useAutoAdvance = ({
  mediaType,
  currentTime,
  duration,
  hasNextEpisode,
  getNextEpisode,
  onNextEpisode,
  enabled = true,
  testMode = false
}) => {
  const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userDismissed, setUserDismissed] = useState(false);
  const countdownIntervalRef = useRef(null);
  const autoAdvanceTimeoutRef = useRef(null);

  // Configuration - AGGRESSIVE FOR TESTING
  const PROMPT_THRESHOLD = testMode ? 999999 : 60; // Show prompt ALWAYS in test mode
  const AUTO_ADVANCE_DELAY = 10; // Auto-advance after 10 seconds if no user action
  const MIN_DURATION = testMode ? 5 : 60; // Only show for videos longer than 5s in test mode
  const VIDEO_END_THRESHOLD = 2; // Consider video "ended" when 2 seconds or less remaining

  // Clear countdown and timeout
  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  // Handle next episode action
  const handleNextEpisode = useCallback(() => {
    console.log('🎬 User selected next episode');
    clearCountdown();
    setShowNextEpisodePrompt(false);
    setUserDismissed(false); // Reset for next episode
    
    if (onNextEpisode) {
      onNextEpisode();
    }
  }, [onNextEpisode, clearCountdown]);

  // Handle dismissing the prompt
  const handleDismiss = useCallback(() => {
    console.log('🎬 User dismissed next episode prompt');
    clearCountdown();
    setShowNextEpisodePrompt(false);
    setUserDismissed(true);
  }, [clearCountdown]);

  // Calculate if we should show the prompt - FORCED FOR TESTING
  const shouldShowPrompt = useCallback(() => {
    console.log('🔍 Auto-advance check:', {
      enabled,
      mediaType,
      hasNextEpisode,
      userDismissed,
      duration,
      currentTime,
      testMode,
      timeRemaining: duration && currentTime ? duration - currentTime : 'N/A'
    });

    if (!enabled || mediaType !== 'tv' || !hasNextEpisode || userDismissed) {
      console.log('🚫 Auto-advance blocked:', { enabled, mediaType, hasNextEpisode, userDismissed });
      return false;
    }

    if (!duration || !currentTime || duration < MIN_DURATION) {
      console.log('🚫 Auto-advance blocked by duration:', { duration, currentTime, MIN_DURATION });
      return false;
    }

    // FORCE SHOW IN TEST MODE
    if (testMode) {
      console.log('🧪 TEST MODE: Force showing auto-advance');
      return true;
    }

    const timeRemaining = duration - currentTime;
    const shouldShow = timeRemaining <= PROMPT_THRESHOLD && timeRemaining > VIDEO_END_THRESHOLD;
    
    if (shouldShow) {
      console.log('✅ Auto-advance should show:', { timeRemaining, PROMPT_THRESHOLD });
    }
    
    return shouldShow;
  }, [enabled, mediaType, hasNextEpisode, userDismissed, duration, currentTime, testMode]);

  // Handle showing/hiding the prompt
  useEffect(() => {
    const shouldShow = shouldShowPrompt();
    
    if (shouldShow && !showNextEpisodePrompt) {
      console.log('🎬 Showing next episode prompt');
      setShowNextEpisodePrompt(true);
      setCountdown(AUTO_ADVANCE_DELAY);
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Auto-advance to next episode
            console.log('⏭️ Auto-advancing to next episode');
            handleNextEpisode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } else if (!shouldShow && showNextEpisodePrompt) {
      console.log('🎬 Hiding next episode prompt');
      setShowNextEpisodePrompt(false);
      clearCountdown();
    }

    return () => {
      clearCountdown();
    };
  }, [shouldShowPrompt, showNextEpisodePrompt, handleNextEpisode, clearCountdown]);

  // Handle auto-advance when video reaches the end
  useEffect(() => {
    if (!enabled || mediaType !== 'tv' || !hasNextEpisode || userDismissed) {
      return;
    }

    if (!duration || !currentTime) {
      return;
    }

    const timeRemaining = duration - currentTime;
    
    // Auto-advance immediately when video reaches the end
    if (timeRemaining <= VIDEO_END_THRESHOLD && timeRemaining > 0) {
      console.log('🎬 Video ending - auto-advancing to next episode');
      handleNextEpisode();
    }
  }, [enabled, mediaType, hasNextEpisode, userDismissed, duration, currentTime, handleNextEpisode]);

  // Reset when episode changes
  const resetForNewEpisode = useCallback(() => {
    console.log('🎬 Resetting auto-advance for new episode');
    clearCountdown();
    setShowNextEpisodePrompt(false);
    setUserDismissed(false);
    setCountdown(0);
  }, [clearCountdown]);

  // Get next episode info for display
  const getNextEpisodeInfo = useCallback(() => {
    if (!getNextEpisode) return null;
    return getNextEpisode();
  }, [getNextEpisode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  return {
    // State
    showNextEpisodePrompt,
    countdown,
    
    // Actions
    handleNextEpisode,
    handleDismiss,
    resetForNewEpisode,
    
    // Info
    getNextEpisodeInfo,
    
    // Config
    isAutoAdvanceEnabled: enabled && mediaType === 'tv',
    timeUntilPrompt: duration && currentTime ? Math.max(0, duration - currentTime - PROMPT_THRESHOLD) : 0
  };
};