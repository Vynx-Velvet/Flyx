'use client';

import React, { useRef, useEffect, useState } from 'react';

const SimpleVideoPlayer = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  onBackToShowDetails
}) => {
  const videoRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hlsInstance, setHlsInstance] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Add volume slider styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        height: 12px;
        width: 12px;
        border-radius: 50%;
        background: #00f5ff;
        cursor: pointer;
        border: 1px solid white;
        box-shadow: 0 0 3px rgba(0, 245, 255, 0.5);
        margin-top: -4px;
      }
      input[type="range"]::-moz-range-thumb {
        height: 12px;
        width: 12px;
        border-radius: 50%;
        background: #00f5ff;
        cursor: pointer;
        border: 1px solid white;
        box-shadow: 0 0 3px rgba(0, 245, 255, 0.5);
      }
      input[type="range"]::-webkit-slider-track {
        background: rgba(255,255,255,0.3);
        height: 4px;
        border-radius: 2px;
      }
      input[type="range"]::-moz-range-track {
        background: rgba(255,255,255,0.3);
        height: 4px;
        border-radius: 2px;
        border: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Extract stream URL
  useEffect(() => {
    const extractStream = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          tmdbId: movieId.toString(),
          ...(mediaType === 'tv' && {
            season: seasonId.toString(),
            episode: episodeId.toString()
          })
        });

        const response = await fetch(`/api/extract-shadowlands?${params}`);
        const data = await response.json();

        if (data.success && data.streamUrl) {
          // Use proxy for shadowlands streams
          const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(data.streamUrl)}&source=shadowlands`;
          setStreamUrl(proxyUrl);
        } else {
          setError(data.error || 'Failed to extract stream');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      extractStream();
    }
  }, [movieId, mediaType, seasonId, episodeId]);

  // Load video when stream URL is available
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Add event listeners for state tracking
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    // Set the video source immediately
    video.src = streamUrl;

    // Check if browser supports HLS natively
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.load();
      return;
    }

    // Load HLS.js for browsers that don't support HLS natively
    const loadHLS = async () => {
      try {
        // Load HLS.js
        if (!window.Hls) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.10/dist/hls.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (window.Hls && window.Hls.isSupported()) {
          const hls = new window.Hls({
            debug: false,
            enableWorker: true
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            // HLS manifest loaded successfully
          });

          hls.on(window.Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            if (data.fatal) {
              setError('HLS playback error');
            }
          });

          setHlsInstance(hls);
        } else {
          // Fallback for unsupported browsers
          video.load();
        }
      } catch (err) {
        console.error('HLS loading error:', err);
        // Fallback to direct playback
        video.load();
      }
    };

    loadHLS();

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);

      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
    };
  }, [streamUrl]);

  // Controls visibility management
  useEffect(() => {
    if (!videoRef.current) return;

    let controlsTimeout;
    const showControlsTemporarily = () => {
      setShowControls(true);
      clearTimeout(controlsTimeout);
      if (isPlaying) {
        controlsTimeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const handleMouseLeave = () => {
      if (isPlaying) {
        controlsTimeout = setTimeout(() => setShowControls(false), 1000);
      }
    };

    const video = videoRef.current;
    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      video.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(controlsTimeout);
    };
  }, [isPlaying]);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (volume) => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      setVolume(volume);
      if (volume > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Initialize volume when video loads
  useEffect(() => {
    if (videoRef.current && duration > 0) {
      setVolume(videoRef.current.volume);
      setIsMuted(videoRef.current.muted);
    }
  }, [duration]);

  const toggleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };


  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px'
      }}>
        Loading stream...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px'
      }}>
        <div>Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        position: 'relative',
        cursor: showControls ? 'default' : 'none'
      }}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setTimeout(() => setShowControls(false), 1000)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        controls={false} // Disable native controls
        autoPlay
        playsInline
        onError={(e) => {
          setError('Video playback error');
        }}
      />

      {/* Custom Controls Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
          padding: '20px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '3px',
            marginBottom: '15px',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={(e) => {
            if (videoRef.current && duration) {
              const rect = e.currentTarget.getBoundingClientRect();
              const progress = (e.clientX - rect.left) / rect.width;
              const newTime = progress * duration;
              videoRef.current.currentTime = newTime;
            }
          }}
        >
          <div
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              height: '100%',
              background: '#00f5ff',
              borderRadius: '3px',
              transition: 'width 0.1s ease'
            }}
          />
        </div>

        {/* Main Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Play/Pause */}
            <button
              onClick={() => isPlaying ? handlePause() : handlePlay()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Skip Backward */}
            <button
              onClick={() => handleSeek(-10)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ⏮️ 10s
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => handleSeek(10)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              10s ⏭️
            </button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                {isMuted || volume === 0 ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{
                  width: '100px',
                  height: '4px',
                  background: 'rgba(255,255,255,0.3)',
                  outline: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  margin: '0'
                }}
              />
            </div>

            {/* Time Display */}
            <div style={{
              color: 'white',
              fontSize: '14px',
              fontFamily: 'monospace',
              minWidth: '100px'
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '4px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              {isFullscreen ? '🗗' : '🗖'}
            </button>

            {/* Back Button */}
            <button
              onClick={onBackToShowDetails}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;