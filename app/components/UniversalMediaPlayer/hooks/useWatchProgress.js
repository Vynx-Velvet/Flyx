import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateContentKey,
  getWatchProgress,
  saveWatchProgress,
  markAsCompleted,
  removeWatchProgress,
  getShowProgress,
  shouldSaveProgress
} from '../utils/watchProgressStorage';

/**
 * useWatchProgress Hook
 * 
 * Manages watch progress tracking for media content with:
 * - Automatic progress saving with throttling
 * - Resume functionality
 * - Completion detection
 * - Progress persistence across sessions
 * - Statistics and analytics
 */
const useWatchProgress = ({
  mediaType,
  movieId,
  seasonId = null,
  episodeId = null,
  videoRef = null,
  autoSave = true,
  saveInterval = 10, // seconds
  completionThreshold = 0.9 // 90% considered complete
} = {}) => {
  // Current progress state
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs for optimization
  const saveTimeoutRef = useRef(null);
  const lastProgressRef = useRef(0);
  const isInitializedRef = useRef(false);
  const contentKeyRef = useRef(null);

  // Generate content key
  const contentKey = generateContentKey(mediaType, movieId, seasonId, episodeId);
  contentKeyRef.current = contentKey;

  // Load initial progress data
  const loadProgress = useCallback(async () => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || !mediaType || !movieId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const progress = getWatchProgress(mediaType, movieId, seasonId, episodeId);
      setProgressData(progress);
      lastProgressRef.current = progress.currentTime || 0;
      console.log(`📊 Loaded watch progress for ${contentKey}:`, progress);
    } catch (error) {
      console.error('❌ Error loading watch progress:', error);
      setProgressData(null);
    } finally {
      setIsLoading(false);
      isInitializedRef.current = true;
    }
  }, [mediaType, movieId, seasonId, episodeId, contentKey]);

  // Save progress data
  const saveProgress = useCallback((progressUpdate = {}) => {
    if (typeof window === 'undefined' || !mediaType || !movieId || !isInitializedRef.current) return false;

    const video = videoRef?.current;
    const currentTime = progressUpdate.currentTime ?? video?.currentTime ?? progressData?.currentTime ?? 0;
    const duration = progressUpdate.duration ?? video?.duration ?? progressData?.duration ?? 1;
    const progress = duration > 0 ? currentTime / duration : 0;

    const updateData = {
      currentTime: Math.max(0, currentTime),
      duration: Math.max(1, duration),
      progress: Math.min(1, Math.max(0, progress)),
      watchCount: (progressData?.watchCount || 0) + (progressUpdate.incrementWatchCount ? 1 : 0),
      resumeCount: (progressData?.resumeCount || 0) + (progressUpdate.incrementResumeCount ? 1 : 0),
      ...progressUpdate
    };

    // Determine completion status
    updateData.isCompleted = updateData.progress >= completionThreshold;
    updateData.isStarted = updateData.progress > 0.05;

    if (updateData.isCompleted && !progressData?.isCompleted) {
      updateData.completedAt = new Date().toISOString();
      console.log(`🎉 Content marked as completed: ${contentKey}`);
    }

    try {
      const success = saveWatchProgress(mediaType, movieId, seasonId, episodeId, updateData);
      
      if (success) {
        setProgressData(prev => ({ ...prev, ...updateData }));
        setLastSaveTime(Date.now());
        setHasUnsavedChanges(false);
        lastProgressRef.current = updateData.currentTime;
        console.log(`💾 Saved progress: ${(updateData.progress * 100).toFixed(1)}%`);
        return true;
      }
    } catch (error) {
      console.error('❌ Error saving watch progress:', error);
    }

    return false;
  }, [mediaType, movieId, seasonId, episodeId, videoRef, progressData, completionThreshold, contentKey]);

  // Auto-save progress with throttling
  const autoSaveProgress = useCallback(() => {
    if (!autoSave || !videoRef?.current || !isInitializedRef.current) return;

    const video = videoRef.current;
    const currentTime = video.currentTime || 0;
    
    // Check if enough time has passed or significant progress made
    const timeSinceLastSave = (Date.now() - lastSaveTime) / 1000;
    const progressDiff = Math.abs(currentTime - lastProgressRef.current);
    
    if (timeSinceLastSave >= saveInterval || progressDiff >= 30) { // Save every interval or 30 seconds of progress
      saveProgress();
    } else {
      setHasUnsavedChanges(true);
    }
  }, [autoSave, videoRef, saveInterval, lastSaveTime, saveProgress]);

  // Manual save with immediate execution
  const forceSave = useCallback(() => {
    return saveProgress();
  }, [saveProgress]);

  // Resume to saved position
  const resumePlayback = useCallback(() => {
    if (!videoRef?.current || !progressData?.currentTime) return false;

    const video = videoRef.current;
    const resumeTime = progressData.currentTime;
    
    // Don't resume if we're near the beginning or end
    if (resumeTime < 10 || resumeTime > (progressData.duration - 30)) {
      return false;
    }

    try {
      video.currentTime = resumeTime;
      saveProgress({ incrementResumeCount: true });
      console.log(`⏯️ Resumed playback at ${resumeTime}s`);
      return true;
    } catch (error) {
      console.error('❌ Error resuming playback:', error);
      return false;
    }
  }, [videoRef, progressData, saveProgress]);

  // Restart from beginning
  const restartPlayback = useCallback(() => {
    if (!videoRef?.current) return false;

    try {
      videoRef.current.currentTime = 0;
      saveProgress({ 
        currentTime: 0, 
        progress: 0, 
        isStarted: true,
        incrementWatchCount: true 
      });
      console.log(`🔄 Restarted playback from beginning`);
      return true;
    } catch (error) {
      console.error('❌ Error restarting playback:', error);
      return false;
    }
  }, [videoRef, saveProgress]);

  // Mark as completed manually
  const markCompleted = useCallback(() => {
    if (typeof window === 'undefined' || !mediaType || !movieId) return false;

    try {
      const success = markAsCompleted(mediaType, movieId, seasonId, episodeId);
      if (success) {
        setProgressData(prev => ({
          ...prev,
          progress: 1.0,
          isCompleted: true,
          completedAt: new Date().toISOString()
        }));
        console.log(`✅ Manually marked as completed: ${contentKey}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error marking as completed:', error);
      return false;
    }
  }, [mediaType, movieId, seasonId, episodeId, contentKey]);

  // Remove progress data
  const clearProgress = useCallback(() => {
    if (typeof window === 'undefined' || !mediaType || !movieId) return false;

    try {
      const success = removeWatchProgress(mediaType, movieId, seasonId, episodeId);
      if (success) {
        setProgressData(null);
        console.log(`🗑️ Cleared progress for: ${contentKey}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error clearing progress:', error);
      return false;
    }
  }, [mediaType, movieId, seasonId, episodeId, contentKey]);

  // Get show-level progress (for TV shows)
  const getShowProgressStats = useCallback(() => {
    if (typeof window === 'undefined' || mediaType !== 'tv' || !movieId) return null;

    try {
      return getShowProgress(movieId);
    } catch (error) {
      console.error('❌ Error getting show progress:', error);
      return null;
    }
  }, [mediaType, movieId]);

  // Check if content should show resume option
  const shouldShowResume = useCallback(() => {
    if (!progressData) return false;
    
    const { currentTime, duration, progress, isCompleted } = progressData;
    
    // Show resume if:
    // - Has meaningful progress (>5% and <90%)
    // - Not completed
    // - More than 10 seconds in
    // - At least 30 seconds from the end
    return (
      progress > 0.05 && 
      progress < 0.9 && 
      !isCompleted &&
      currentTime > 10 &&
      currentTime < (duration - 30)
    );
  }, [progressData]);

  // Initialize progress loading (only in browser)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadProgress();
    }
  }, [loadProgress]);

  // Auto-save progress periodically
  useEffect(() => {
    if (!autoSave || !videoRef?.current) return;

    const interval = setInterval(autoSaveProgress, saveInterval * 1000);
    return () => clearInterval(interval);
  }, [autoSave, autoSaveProgress, saveInterval]);

  // **CRITICAL FIX: PROTECTED Save progress when video ends - avoid conflicts during playback start**
  useEffect(() => {
    if (!videoRef?.current || !autoSave) return;

    const video = videoRef.current;
    
    // **PLAYBACK START PROTECTION: Add delay to avoid conflict with main player events**
    const handleEnded = () => {
      // Small delay to avoid conflicts with main player state sync
      setTimeout(() => {
        saveProgress({
          currentTime: video.duration,
          progress: 1.0,
          isCompleted: true,
          completedAt: new Date().toISOString()
        });
      }, 100);
    };

    const handleTimeUpdate = () => {
      // **CRITICAL: Skip during rapid events at playback start**
      // Only save if enough time has passed AND not in rapid event period
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTime;
      
      // More conservative throttling to avoid conflicts
      if (timeSinceLastSave > 2000 && shouldSaveProgress(lastSaveTime, now)) {
        // Add small delay to avoid conflicts
        setTimeout(() => {
          autoSaveProgress();
        }, 50);
      }
    };

    // **PASSIVE EVENT LISTENERS: Don't interfere with main player's event handling**
    video.addEventListener('ended', handleEnded, { passive: true });
    video.addEventListener('timeupdate', handleTimeUpdate, { passive: true });

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, autoSave, saveProgress, autoSaveProgress, lastSaveTime]);

  // Save progress when component unmounts or content changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Final save before unmount
      if (hasUnsavedChanges && isInitializedRef.current) {
        forceSave();
      }
    };
  }, [forceSave, hasUnsavedChanges]);

  // Computed properties
  const progressPercentage = progressData?.progress ? Math.round(progressData.progress * 100) : 0;
  const isCompleted = progressData?.isCompleted || false;
  const isStarted = progressData?.isStarted || false;
  const canResume = shouldShowResume();
  const timeRemaining = progressData?.duration 
    ? progressData.duration - (progressData.currentTime || 0) 
    : 0;

  return {
    // Progress data
    progressData,
    progressPercentage,
    isCompleted,
    isStarted,
    canResume,
    timeRemaining,
    isLoading,
    hasUnsavedChanges,

    // Actions
    saveProgress,
    forceSave,
    resumePlayback,
    restartPlayback,
    markCompleted,
    clearProgress,
    loadProgress,

    // Utilities
    shouldShowResume,
    getShowProgressStats,
    
    // State
    contentKey,
    lastSaveTime
  };
};

export default useWatchProgress;