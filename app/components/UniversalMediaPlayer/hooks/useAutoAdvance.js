import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAutoAdvance - Manages automatic episode advancement for TV shows
 * 
 * Features:
 * - Smart countdown prompts before episode ends
 * - User preference learning and adaptation
 * - Customizable countdown timing and behavior
 * - AI-powered prediction of user intent
 * - Skip intro/outro detection
 */
const useAutoAdvance = ({
  mediaType,
  currentTime,
  duration,
  hasNextEpisode,
  getNextEpisode,
  onNextEpisode,
  enabled = true,
  aiPrediction = false,
  userPreferences = {}
} = {}) => {
  // Configuration with user preferences
  const config = {
    promptTime: 30, // Show prompt 30 seconds before end
    countdownDuration: 10, // 10 second countdown
    skipIntroTime: 90, // Skip intro after 90 seconds
    skipOutroTime: 30, // Skip outro in last 30 seconds
    autoAdvanceEnabled: true,
    showSkipIntro: true,
    showSkipOutro: true,
    ...userPreferences
  };

  // State management
  const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
  const [countdown, setCountdown] = useState(config.countdownDuration);
  const [nextEpisodeInfo, setNextEpisodeInfo] = useState(null);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [userEngagement, setUserEngagement] = useState({
    episodeCompletions: 0,
    autoAdvanceAccepted: 0,
    autoAdvanceDismissed: 0,
    skipIntroUsed: 0,
    skipOutroUsed: 0
  });

  // Refs for cleanup
  const countdownTimerRef = useRef(null);
  const promptTimerRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);

  // AI prediction for user behavior
  const predictUserAction = useCallback(() => {
    if (!aiPrediction) return 'neutral';

    const { autoAdvanceAccepted, autoAdvanceDismissed } = userEngagement;
    const totalInteractions = autoAdvanceAccepted + autoAdvanceDismissed;

    if (totalInteractions === 0) return 'neutral';

    const acceptanceRate = autoAdvanceAccepted / totalInteractions;

    if (acceptanceRate >= 0.8) return 'likely_accept';
    if (acceptanceRate <= 0.2) return 'likely_dismiss';
    return 'neutral';
  }, [aiPrediction, userEngagement]);

  // Get next episode information
  const fetchNextEpisodeInfo = useCallback(() => {
    if (!hasNextEpisode || !getNextEpisode) return null;

    const nextEp = getNextEpisode();
    if (!nextEp) return null;

    return {
      id: nextEp.episode.id,
      title: nextEp.episode.title,
      description: nextEp.episode.description,
      duration: nextEp.episode.duration,
      seasonNumber: nextEp.season.number,
      episodeNumber: nextEp.episode.number,
      thumbnail: nextEp.episode.thumbnail,
      airDate: nextEp.episode.airDate,
      rating: nextEp.episode.rating
    };
  }, [hasNextEpisode, getNextEpisode]);

  // Start countdown
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    setCountdown(config.countdownDuration);
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          // Auto-advance when countdown reaches 0
          if (config.autoAdvanceEnabled && onNextEpisode) {
            handleNextEpisode();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [config.countdownDuration, config.autoAdvanceEnabled, onNextEpisode]);

  // Handle next episode action
  const handleNextEpisode = useCallback(() => {
    if (onNextEpisode) {
      setUserEngagement(prev => ({
        ...prev,
        episodeCompletions: prev.episodeCompletions + 1,
        autoAdvanceAccepted: prev.autoAdvanceAccepted + 1
      }));
      
      onNextEpisode();
    }
    
    // Clean up
    setShowNextEpisodePrompt(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, [onNextEpisode]);

  // Handle dismiss prompt
  const handleDismiss = useCallback(() => {
    setUserEngagement(prev => ({
      ...prev,
      autoAdvanceDismissed: prev.autoAdvanceDismissed + 1
    }));

    setShowNextEpisodePrompt(false);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
  }, []);

  // Handle skip intro
  const handleSkipIntro = useCallback(() => {
    setUserEngagement(prev => ({
      ...prev,
      skipIntroUsed: prev.skipIntroUsed + 1
    }));

    setShowSkipIntro(false);
    // In a real implementation, this would seek to after the intro
    // For now, we'll just simulate skipping 90 seconds
    console.log('Skipping intro to time:', config.skipIntroTime);
  }, [config.skipIntroTime]);

  // Handle skip outro
  const handleSkipOutro = useCallback(() => {
    setUserEngagement(prev => ({
      ...prev,
      skipOutroUsed: prev.skipOutroUsed + 1
    }));

    setShowSkipOutro(false);
    // Auto-advance to next episode
    if (hasNextEpisode) {
      handleNextEpisode();
    }
  }, [hasNextEpisode, handleNextEpisode]);

  // Reset for new episode
  const resetForNewEpisode = useCallback(() => {
    setShowNextEpisodePrompt(false);
    setShowSkipIntro(false);
    setShowSkipOutro(false);
    setCountdown(config.countdownDuration);
    
    // Clear all timers
    [countdownTimerRef, promptTimerRef, autoAdvanceTimerRef].forEach(ref => {
      if (ref.current) {
        clearInterval(ref.current);
        clearTimeout(ref.current);
      }
    });

    // Set up skip intro for new episode
    if (config.showSkipIntro && mediaType === 'tv') {
      setTimeout(() => {
        setShowSkipIntro(true);
      }, 5000); // Show skip intro after 5 seconds

      setTimeout(() => {
        setShowSkipIntro(false);
      }, config.skipIntroTime * 1000); // Hide after intro time
    }
  }, [config.countdownDuration, config.showSkipIntro, config.skipIntroTime, mediaType]);

  // Main effect for managing auto-advance logic
  useEffect(() => {
    if (!enabled || mediaType !== 'tv' || !duration || duration === 0) {
      return;
    }

    const timeRemaining = duration - currentTime;
    const shouldShowPrompt = timeRemaining <= config.promptTime && timeRemaining > 0;
    const shouldShowSkipOutro = timeRemaining <= config.skipOutroTime && timeRemaining > 0;

    // Show next episode prompt
    if (shouldShowPrompt && hasNextEpisode && !showNextEpisodePrompt) {
      const nextInfo = fetchNextEpisodeInfo();
      if (nextInfo) {
        setNextEpisodeInfo(nextInfo);
        setShowNextEpisodePrompt(true);
        startCountdown();
      }
    }

    // Show skip outro
    if (shouldShowSkipOutro && hasNextEpisode && !showSkipOutro && config.showSkipOutro) {
      setShowSkipOutro(true);
    }

    // Hide prompt if time has passed
    if (timeRemaining > config.promptTime && showNextEpisodePrompt) {
      setShowNextEpisodePrompt(false);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    }

  }, [
    enabled,
    mediaType,
    currentTime,
    duration,
    hasNextEpisode,
    showNextEpisodePrompt,
    showSkipOutro,
    config.promptTime,
    config.skipOutroTime,
    config.showSkipOutro,
    fetchNextEpisodeInfo,
    startCountdown
  ]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      [countdownTimerRef, promptTimerRef, autoAdvanceTimerRef].forEach(ref => {
        if (ref.current) {
          clearInterval(ref.current);
          clearTimeout(ref.current);
        }
      });
    };
  }, []);

  // Get user preference insights
  const getUserInsights = useCallback(() => {
    const { autoAdvanceAccepted, autoAdvanceDismissed, skipIntroUsed, skipOutroUsed } = userEngagement;
    const totalAutoAdvance = autoAdvanceAccepted + autoAdvanceDismissed;
    
    return {
      autoAdvanceAcceptanceRate: totalAutoAdvance > 0 ? (autoAdvanceAccepted / totalAutoAdvance) : 0,
      prefersAutoAdvance: autoAdvanceAccepted > autoAdvanceDismissed,
      usesSkipFeatures: (skipIntroUsed + skipOutroUsed) > 0,
      engagementLevel: userEngagement.episodeCompletions > 5 ? 'high' : 
                      userEngagement.episodeCompletions > 2 ? 'medium' : 'low',
      predictedAction: predictUserAction()
    };
  }, [userEngagement, predictUserAction]);

  // Update configuration
  const updateConfig = useCallback((newConfig) => {
    Object.assign(config, newConfig);
  }, []);

  return {
    // State
    showNextEpisodePrompt,
    countdown,
    nextEpisodeInfo,
    showSkipIntro,
    showSkipOutro,
    userEngagement,

    // Actions
    handleNextEpisode,
    handleDismiss,
    handleSkipIntro,
    handleSkipOutro,
    resetForNewEpisode,

    // Configuration
    updateConfig,
    config,

    // Insights
    getUserInsights,
    predictedAction: predictUserAction(),

    // Utilities
    isCountdownActive: countdownTimerRef.current !== null,
    timeUntilPrompt: Math.max(0, duration - currentTime - config.promptTime),
    shouldAutoAdvance: config.autoAdvanceEnabled && getUserInsights().prefersAutoAdvance
  };
};

export default useAutoAdvance;