'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useErrorRecovery } from '../utils/errorRecovery';

/**
 * Core media player hook that manages video playback state and HLS integration
 * This replaces the monolithic state management in the main component
 */
export const useMediaPlayer = ({
  streamUrl,
  streamType,
  onError,
  onLoadStart,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onSeeking,
  onSeeked,
  onVolumeChange,
  onLoadProgress
}) => {
  // Core refs
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const networkMonitorRef = useRef(null);

  // Core player state - single source of truth
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    duration: 0,
    currentTime: 0,
    isFullscreen: false,
    buffered: 0,
    isLoading: false,
    hasError: false,
    errorMessage: null,
    readyState: 0,
    networkState: 0,
    seeking: false,
    ended: false
  });

  // Track video element availability
  const [videoElementReady, setVideoElementReady] = useState(false);

  // Error recovery hook
  const {
    handleError: handleRecoverableError,
    reset: resetErrorRecovery,
    isRecovering,
    retryCount
  } = useErrorRecovery({
    maxRetries: 3,
    onError: (error) => {
      console.error('Unrecoverable error:', error);
      setPlayerState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error.message || 'An error occurred'
      }));
      onError?.(error);
    },
    onRecovery: () => {
      // Handle recovery attempt
    },
    onMaxRetriesExceeded: (error) => {
      console.error('Max retries exceeded:', error);
    }
  });

  // Optimized state sync function
  const forceStateSync = useCallback((eventType = 'unknown') => {
    const video = videoRef.current;
    if (!video) return false;

    try {
      const videoState = {
        isPlaying: !video.paused && video.readyState >= 2,
        currentTime: isFinite(video.currentTime) ? video.currentTime : 0,
        duration: isFinite(video.duration) ? video.duration : 0,
        volume: isFinite(video.volume) ? video.volume : 0.8,
        isMuted: Boolean(video.muted),
        buffered: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
        readyState: video.readyState,
        networkState: video.networkState,
        seeking: Boolean(video.seeking),
        ended: Boolean(video.ended),
        error: video.error
      };

      setPlayerState(prev => {
        const changes = {};
        let hasChanges = false;

        // Only update if values actually changed
        Object.entries(videoState).forEach(([key, value]) => {
          if (prev[key] !== value) {
            changes[key] = value;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          const newState = {
            ...prev,
            ...changes,
            hasError: Boolean(videoState.error),
            errorMessage: videoState.error?.message || null,
            isLoading: videoState.readyState < 2
          };

          // Trigger appropriate callbacks
          if (changes.currentTime !== undefined) onTimeUpdate?.(videoState.currentTime);
          if (changes.isPlaying !== undefined) {
            if (videoState.isPlaying) onPlay?.();
            else onPause?.();
          }
          if (changes.ended !== undefined && videoState.ended) onEnded?.();

          return newState;
        }

        return prev;
      });

      return true;
    } catch (error) {
      console.error('State sync error:', error);
      return false;
    }
  }, [onTimeUpdate, onPlay, onPause, onEnded]);

  // Player actions
  const playerActions = useMemo(() => ({
    play: async () => {
      const video = videoRef.current;
      if (!video) {
        return false;
      }

      if (video.readyState < 2) {
        return false;
      }

      try {
        await video.play();
        forceStateSync('player-action-play');
        return true;
      } catch (err) {
        console.error('Play error:', err);
        handleRecoverableError(err);
        return false;
      }
    },

    pause: () => {
      const video = videoRef.current;
      if (!video) {
        return false;
      }

      try {
        video.pause();
        forceStateSync('player-action-pause');
        return true;
      } catch (err) {
        console.error('Pause error:', err);
        return false;
      }
    },

    seek: (time) => {
      const video = videoRef.current;
      if (!video || !isFinite(time)) {
        return false;
      }

      try {
        const clampedTime = Math.max(0, Math.min(video.duration || 0, time));
        video.currentTime = clampedTime;
        forceStateSync('player-action-seek');
        return true;
      } catch (err) {
        console.error('Seek error:', err);
        return false;
      }
    },

    setVolume: (volume) => {
      const video = videoRef.current;
      if (!video || !isFinite(volume)) {
        return false;
      }

      try {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        video.volume = clampedVolume;
        video.muted = clampedVolume === 0;
        forceStateSync('player-action-volume');
        return true;
      } catch (err) {
        console.error('Volume error:', err);
        return false;
      }
    },

    toggleMute: () => {
      const video = videoRef.current;
      if (!video) {
        return false;
      }

      try {
        const newMutedState = !video.muted;
        video.muted = newMutedState;
        forceStateSync('player-action-mute');
        return true;
      } catch (err) {
        console.error('Mute error:', err);
        return false;
      }
    },

    setPlaybackRate: (rate) => {
      const video = videoRef.current;
      if (!video || !isFinite(rate)) {
        return false;
      }

      try {
        const clampedRate = Math.max(0.25, Math.min(4, rate));
        video.playbackRate = clampedRate;
        forceStateSync('player-action-rate');
        return true;
      } catch (err) {
        console.error('Playback rate error:', err);
        return false;
      }
    }
  }), [forceStateSync, handleRecoverableError]);

  // HLS.js loading and management
  const loadHLS = useCallback(async () => {
    if (!streamUrl || streamType !== 'hls' || !videoRef.current) {
      return;
    }

    // Check for native HLS support
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      return;
    }

    try {
      // Load HLS.js dynamically
      let Hls;
      if (window.Hls) {
        Hls = window.Hls;
      } else {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.10/dist/hls.min.js';
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
          document.head.appendChild(script);
        });
        Hls = window.Hls;
      }

      if (!Hls?.isSupported()) {
        videoRef.current.src = streamUrl;
        return;
      }

      // Clean up existing instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Create HLS instance
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        startLevel: -1,
        capLevelToPlayerSize: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;

      // HLS event handlers
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        forceStateSync('hls-manifest-parsed');
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        // Quality level switched
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              hlsRef.current = null;
              videoRef.current.src = streamUrl;
              break;
          }
        }
      });

      // Load source
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

    } catch (error) {
      console.error('HLS loading error:', error);
      // Fallback to native playback
      videoRef.current.src = streamUrl;
    }
  }, [streamUrl, streamType]);

  // Create callback ref for video element
  const setVideoRef = useCallback((element) => {
    videoRef.current = element;
    setVideoElementReady(!!element);
  }, []);

  // Video element event handlers - only run when video element is ready
  useEffect(() => {
    if (!videoElementReady || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    const handleLoadedMetadata = () => {
      forceStateSync('video-loadedmetadata');
      onLoadedMetadata?.();
    };

    const handleTimeUpdate = () => {
      forceStateSync('video-timeupdate');
    };

    const handlePlay = () => {
      forceStateSync('video-play');
      onPlay?.();
    };

    const handlePause = () => {
      forceStateSync('video-pause');
      onPause?.();
    };

    const handleError = (e) => {
      console.error('Video playback error:', video.error);
      handleRecoverableError(new Error('Video playback error'));
      onError?.(e);
    };

    const handleLoadStart = () => {
      onLoadStart?.();
    };

    const handleSeeking = () => {
      forceStateSync('video-seeking');
      onSeeking?.();
    };

    const handleSeeked = () => {
      forceStateSync('video-seeked');
      onSeeked?.();
    };

    const handleVolumeChange = () => {
      forceStateSync('video-volumechange');
      onVolumeChange?.();
    };

    const handleProgress = () => {
      forceStateSync('video-progress');
      onLoadProgress?.();
    };

    const handleEnded = () => {
      forceStateSync('video-ended');
      onEnded?.();
    };

    const handleCanPlay = () => {
      // Video can start playing
    };

    const handleCanPlayThrough = () => {
      // Video can play through without buffering
    };

    const handleWaiting = () => {
      // Video is buffering
    };

    const handleStalled = () => {
      // Video stalled during loading
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);

    // Initial sync
    forceStateSync('video-initialization');

    return () => {
      // Remove event listeners
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [videoElementReady, forceStateSync, handleRecoverableError, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onError, onLoadStart, onSeeking, onSeeked, onVolumeChange, onLoadProgress, onEnded]);

  // Load stream when URL changes
  useEffect(() => {
    if (!streamUrl || !videoRef.current) {
      return;
    }

    if (streamType === 'hls') {
      loadHLS();
    } else {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
    }

    return () => {
      // Cleanup HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, streamType, loadHLS]);

  // Intelligent sync interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current) {
        forceStateSync('intelligent-sync');
      }
    }, 1000); // Less aggressive than before

    return () => clearInterval(interval);
  }, [forceStateSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (networkMonitorRef.current) {
        networkMonitorRef.current.stop();
      }
    };
  }, []);

  return {
    videoRef: setVideoRef,
    playerState,
    playerActions,
    isRecovering,
    retryCount,
    resetErrorRecovery,
    forceStateSync
  };
};

export default useMediaPlayer;