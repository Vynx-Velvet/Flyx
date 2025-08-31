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

    // Check if browser supports HLS natively
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
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
            console.log('HLS manifest parsed');
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
          video.src = streamUrl;
          video.load();
        }
      } catch (err) {
        console.error('HLS loading error:', err);
        // Fallback to direct playback
        video.src = streamUrl;
        video.load();
      }
    };

    loadHLS();

    // Cleanup
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
    };
  }, [streamUrl]);

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

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      position: 'relative'
    }}>
      {/* Video Element */}
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        controls
        autoPlay
        playsInline
        onError={(e) => {
          console.error('Video error:', e);
          setError('Video playback error');
        }}
      />

      {/* Back Button */}
      <button
        onClick={onBackToShowDetails}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 15px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ← Back
      </button>

      {/* Debug Info */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        Stream: {streamUrl ? '✅' : '❌'}<br/>
        HLS: {hlsInstance ? '✅' : '❌'}
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;