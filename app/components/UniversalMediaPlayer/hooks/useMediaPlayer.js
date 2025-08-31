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
      console.log('Attempting recovery...');
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
        console.log('🎬 PLAYER ACTION: Play failed - no video element');
        return false;
      }

      if (video.readyState < 2) {
        console.log('🎬 PLAYER ACTION: Play failed - video not ready', {
          readyState: video.readyState,
          networkState: video.networkState,
          src: video.src ? video.src.substring(0, 100) + '...' : 'no src'
        });
        return false;
      }

      console.log('🎬 PLAYER ACTION: Attempting to play video', {
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        readyState: video.readyState
      });

      try {
        await video.play();
        console.log('🎬 PLAYER ACTION: Play successful');
        forceStateSync('player-action-play');
        return true;
      } catch (err) {
        console.error('🎬 PLAYER ACTION: Play error:', err);
        handleRecoverableError(err);
        return false;
      }
    },

    pause: () => {
      const video = videoRef.current;
      if (!video) {
        console.log('🎬 PLAYER ACTION: Pause failed - no video element');
        return false;
      }

      console.log('🎬 PLAYER ACTION: Pausing video');
      try {
        video.pause();
        forceStateSync('player-action-pause');
        return true;
      } catch (err) {
        console.error('🎬 PLAYER ACTION: Pause error:', err);
        return false;
      }
    },

    seek: (time) => {
      const video = videoRef.current;
      if (!video || !isFinite(time)) {
        console.log('🎬 PLAYER ACTION: Seek failed - invalid parameters', {
          hasVideo: !!video,
          time: time,
          isFinite: isFinite(time)
        });
        return false;
      }

      try {
        const clampedTime = Math.max(0, Math.min(video.duration || 0, time));
        console.log('🎬 PLAYER ACTION: Seeking to', clampedTime, 'from', video.currentTime);
        video.currentTime = clampedTime;
        forceStateSync('player-action-seek');
        return true;
      } catch (err) {
        console.error('🎬 PLAYER ACTION: Seek error:', err);
        return false;
      }
    },

    setVolume: (volume) => {
      const video = videoRef.current;
      if (!video || !isFinite(volume)) {
        console.log('🎬 PLAYER ACTION: Set volume failed - invalid parameters', {
          hasVideo: !!video,
          volume: volume,
          isFinite: isFinite(volume)
        });
        return false;
      }

      try {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log('🎬 PLAYER ACTION: Setting volume to', clampedVolume);
        video.volume = clampedVolume;
        video.muted = clampedVolume === 0;
        forceStateSync('player-action-volume');
        return true;
      } catch (err) {
        console.error('🎬 PLAYER ACTION: Volume error:', err);
        return false;
      }
    },

    toggleMute: () => {
      const video = videoRef.current;
      if (!video) {
        console.log('🎬 PLAYER ACTION: Toggle mute failed - no video element');
        return false;
      }

      try {
        const newMutedState = !video.muted;
        console.log('🎬 PLAYER ACTION: Toggling mute to', newMutedState);
        video.muted = newMutedState;
        forceStateSync('player-action-mute');
        return true;
      } catch (err) {
        console.error('🎬 PLAYER ACTION: Mute error:', err);
        return false;
      }
    },

    setPlaybackRate: (rate) => {
      const video = videoRef.current;
      if (!video || !isFinite(rate)) {
        console.log('🎬 PLAYER ACTION: Set playback rate failed - invalid parameters', {
          hasVideo: !!video,
          rate: rate,
          isFinite: isFinite(rate)
        });
        return false;
      }

      try {
        const clampedRate = Math.max(0.25, Math.min(4, rate));
        console.log('🎬 PLAYER ACTION: Setting playback rate to', clampedRate);
        video.playbackRate = clampedRate;
        forceStateSync('player-action-rate');
        return true;
      } catch (err) {
        console.error('🎬 PLAYER ACTION: Playback rate error:', err);
        return false;
      }
    }
  }), [forceStateSync, handleRecoverableError]);

  // HLS.js loading and management
  const loadHLS = useCallback(async () => {
    if (!streamUrl || streamType !== 'hls' || !videoRef.current) {
      console.log('🎬 HLS: Skipping HLS load - missing requirements', {
        hasStreamUrl: !!streamUrl,
        streamType,
        hasVideoRef: !!videoRef.current
      });
      return;
    }

    console.log('🎬 HLS: Starting HLS load process', {
      streamUrl: streamUrl.substring(0, 100) + '...',
      canPlayNativeHLS: videoRef.current.canPlayType('application/vnd.apple.mpegurl')
    });

    // Check for native HLS support
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('🎬 HLS: Using native HLS support');
      videoRef.current.src = streamUrl;
      return;
    }

    try {
      console.log('🎬 HLS: Loading HLS.js library');

      // Load HLS.js dynamically
      let Hls;
      if (window.Hls) {
        console.log('🎬 HLS: HLS.js already loaded');
        Hls = window.Hls;
      } else {
        console.log('🎬 HLS: Loading HLS.js from CDN');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.10/dist/hls.min.js';
          script.onload = () => {
            console.log('🎬 HLS: HLS.js script loaded successfully');
            resolve();
          };
          script.onerror = (e) => {
            console.error('🎬 HLS: Failed to load HLS.js script', e);
            reject(e);
          };
          document.head.appendChild(script);
        });
        Hls = window.Hls;
      }

      if (!Hls?.isSupported()) {
        console.warn('🎬 HLS: HLS.js not supported, falling back to native playback');
        videoRef.current.src = streamUrl;
        return;
      }

      console.log('🎬 HLS: HLS.js is supported, creating instance');

      // Clean up existing instance
      if (hlsRef.current) {
        console.log('🎬 HLS: Destroying existing HLS instance');
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

      console.log('🎬 HLS: HLS instance created, setting up event handlers');
      hlsRef.current = hls;

      // HLS event handlers
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('🎬 HLS: Manifest parsed successfully');
        forceStateSync('hls-manifest-parsed');
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log(`🎬 HLS: Quality switched to level ${data.level}`);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('🎬 HLS: HLS Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🎬 HLS: Fatal network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🎬 HLS: Fatal media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('🎬 HLS: Fatal error, destroying HLS instance');
              hls.destroy();
              hlsRef.current = null;
              videoRef.current.src = streamUrl;
              break;
          }
        }
      });

      // Load source
      console.log('🎬 HLS: Loading source and attaching to media element');
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      console.log('🎬 HLS: Source loaded and media attached');

    } catch (error) {
      console.error('🎬 HLS: HLS loading error:', error);
      // Fallback to native playback
      console.log('🎬 HLS: Falling back to native playback');
      videoRef.current.src = streamUrl;
    }
  }, [streamUrl, streamType]);

  // Create callback ref for video element
  const setVideoRef = useCallback((element) => {
    console.log('🎬 VIDEO: setVideoRef called', { element, currentRef: videoRef.current });
    videoRef.current = element;
    setVideoElementReady(!!element);
  }, []);

  // Video element event handlers - only run when video element is ready
  useEffect(() => {
    if (!videoElementReady || !videoRef.current) {
      console.log('🎬 VIDEO: Video element not ready yet', { videoElementReady, hasRef: !!videoRef.current });
      return;
    }

    const video = videoRef.current;
    console.log('🎬 VIDEO: Setting up video event handlers on element:', video);

    const handleLoadedMetadata = () => {
      console.log('🎬 VIDEO: loadedmetadata - metadata loaded successfully', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
      forceStateSync('video-loadedmetadata');
      onLoadedMetadata?.();
    };

    const handleTimeUpdate = () => {
      // Only log occasionally to avoid spam
      if (Math.floor(video.currentTime) % 10 === 0) {
        console.log('🎬 VIDEO: timeupdate', {
          currentTime: video.currentTime,
          duration: video.duration,
          buffered: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0
        });
      }
      forceStateSync('video-timeupdate');
    };

    const handlePlay = () => {
      console.log('🎬 VIDEO: play event fired - video is now playing');
      forceStateSync('video-play');
      onPlay?.();
    };

    const handlePause = () => {
      console.log('🎬 VIDEO: pause event fired - video is now paused');
      forceStateSync('video-pause');
      onPause?.();
    };

    const handleError = (e) => {
      console.error('🎬 VIDEO: Error event fired', {
        error: video.error,
        errorCode: video.error?.code,
        errorMessage: video.error?.message,
        networkState: video.networkState,
        readyState: video.readyState,
        src: video.src ? video.src.substring(0, 100) + '...' : 'no src'
      });
      handleRecoverableError(new Error('Video playback error'));
      onError?.(e);
    };

    const handleLoadStart = () => {
      console.log('🎬 VIDEO: loadstart - began loading video', {
        src: video.src ? video.src.substring(0, 100) + '...' : 'no src',
        networkState: video.networkState,
        readyState: video.readyState
      });
      onLoadStart?.();
    };

    const handleSeeking = () => {
      console.log('🎬 VIDEO: seeking to', video.currentTime);
      forceStateSync('video-seeking');
      onSeeking?.();
    };

    const handleSeeked = () => {
      console.log('🎬 VIDEO: seeked to', video.currentTime);
      forceStateSync('video-seeked');
      onSeeked?.();
    };

    const handleVolumeChange = () => {
      console.log('🎬 VIDEO: volume changed', {
        volume: video.volume,
        muted: video.muted
      });
      forceStateSync('video-volumechange');
      onVolumeChange?.();
    };

    const handleProgress = () => {
      console.log('🎬 VIDEO: progress - buffering update', {
        buffered: video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0,
        duration: video.duration
      });
      forceStateSync('video-progress');
      onLoadProgress?.();
    };

    const handleEnded = () => {
      console.log('🎬 VIDEO: ended - video playback completed');
      forceStateSync('video-ended');
      onEnded?.();
    };

    const handleCanPlay = () => {
      console.log('🎬 VIDEO: canplay - video can start playing', {
        readyState: video.readyState,
        networkState: video.networkState
      });
    };

    const handleCanPlayThrough = () => {
      console.log('🎬 VIDEO: canplaythrough - video can play through without buffering', {
        readyState: video.readyState,
        networkState: video.networkState
      });
    };

    const handleWaiting = () => {
      console.log('🎬 VIDEO: waiting - video is buffering');
    };

    const handleStalled = () => {
      console.log('🎬 VIDEO: stalled - video stalled during loading');
    };

    // Add event listeners
    console.log('🎬 VIDEO: Adding event listeners');
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
    console.log('🎬 VIDEO: Initial state sync');
    forceStateSync('video-initialization');

    return () => {
      console.log('🎬 VIDEO: Removing video event handlers');
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
      console.log('🎬 MEDIA PLAYER: Skipping stream load - missing streamUrl or videoRef', {
        hasStreamUrl: !!streamUrl,
        hasVideoRef: !!videoRef.current,
        streamUrl: streamUrl ? streamUrl.substring(0, 100) + '...' : null
      });
      return;
    }

    console.log('🎬 MEDIA PLAYER: Loading stream', {
      streamType,
      streamUrl: streamUrl.substring(0, 100) + '...',
      videoElementExists: !!videoRef.current,
      videoReadyState: videoRef.current.readyState,
      videoNetworkState: videoRef.current.networkState
    });

    if (streamType === 'hls') {
      console.log('🎬 MEDIA PLAYER: Loading HLS stream');
      loadHLS();
    } else {
      console.log('🎬 MEDIA PLAYER: Loading direct stream');
      videoRef.current.src = streamUrl;
      console.log('🎬 MEDIA PLAYER: Set video src to:', streamUrl.substring(0, 100) + '...');
      videoRef.current.load();
      console.log('🎬 MEDIA PLAYER: Called video.load()');
    }

    return () => {
      // Cleanup HLS instance
      if (hlsRef.current) {
        console.log('🎬 MEDIA PLAYER: Cleaning up HLS instance');
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