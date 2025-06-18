'use client'

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./UniversalMediaPlayer.module.css";
import { useMediaContext } from '../context/MediaContext';

// Device detection utility
const getDeviceType = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  const isTV = /smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast\.tv|tizen|webos|roku|samsung|lg|panasonic|philips|sony|vizio/i.test(userAgent) ||
    /tv|television/i.test(userAgent) ||
    window.screen.width >= 1920 || // Assume large screens are TVs
    (window.screen.width >= 1280 && window.screen.height >= 720 && window.devicePixelRatio <= 1.5);
  
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
    window.screen.width <= 768;
  
  return isTV ? 'tv' : isMobile ? 'mobile' : 'desktop';
};

// Simple, reliable media player for universal compatibility
const UniversalMediaPlayer = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  maxEpisodes,
  onEpisodeChange,
  onBackToShowDetails,
}) => {
  // Core player state
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [server, setServer] = useState("Vidsrc.xyz");
  
  // Simple quality state
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  
  // Subtitle state - using native HTML5 tracks
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  
  // Device-specific behavior
  const [deviceType, setDeviceType] = useState('unknown');
  const [useNativeControls, setUseNativeControls] = useState(false);
  
  // Progress tracking
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionPhase, setExtractionPhase] = useState('');
  
  const videoRef = useRef(null);
  const { fetchDetailedMedia, getMedia } = useMediaContext();
  
  // Initialize device detection
  useEffect(() => {
    const device = getDeviceType();
    setDeviceType(device);
    
    // Use native controls on TVs and older devices for maximum compatibility
    setUseNativeControls(device === 'tv' || device === 'unknown');
    
    console.log('🎯 Device detected:', device, 'Using native controls:', device === 'tv');
  }, []);

  // Simple stream extraction without complex features
  const extractStream = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExtractionProgress(0);
    setExtractionPhase('Initializing...');
    
    try {
      // Build extraction parameters
      const params = new URLSearchParams({
        mediaType,
        movieId: movieId.toString(),
        server: server === "Vidsrc.xyz" ? "vidsrc.xyz" : "embed.su"
      });
      
      if (mediaType === 'tv') {
        params.append('seasonId', seasonId.toString());
        params.append('episodeId', episodeId.toString());
      }
      
      setExtractionPhase('Connecting to server...');
      setExtractionProgress(20);
      
      // Use simple fetch instead of SSE for better compatibility
      const response = await fetch(`/api/extract-stream?${params}`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      setExtractionPhase('Processing stream...');
      setExtractionProgress(60);
      
      const data = await response.json();
      
      if (data.success && data.streamUrl) {
        setStreamUrl(data.streamUrl);
        setExtractionProgress(100);
        setExtractionPhase('Stream ready!');
        
        // Extract quality info if available
        if (data.qualities && Array.isArray(data.qualities)) {
          setAvailableQualities(data.qualities);
        }
        
        // Load subtitles if available
        if (data.subtitles && Array.isArray(data.subtitles)) {
          loadSubtitles(data.subtitles);
        }
        
        console.log('✅ Stream extracted successfully:', data.streamUrl);
      } else {
        throw new Error(data.error || 'Failed to extract stream');
      }
    } catch (err) {
      console.error('❌ Stream extraction failed:', err);
      setError(err.message);
      setExtractionProgress(0);
      setExtractionPhase('');
    } finally {
      setLoading(false);
    }
  }, [mediaType, movieId, seasonId, episodeId, server]);

  // Load subtitles using native HTML5 track elements
  const loadSubtitles = useCallback((subtitleData) => {
    if (!Array.isArray(subtitleData) || subtitleData.length === 0) return;
    
    try {
      const tracks = subtitleData
        .filter(sub => sub.url || sub.content) // Only include subtitles with accessible content
        .map((sub, index) => ({
          id: `sub_${index}`,
          src: sub.url || createDataUrl(sub.content),
          label: sub.languageName || sub.language || `Subtitle ${index + 1}`,
          srcLang: sub.iso639 || 'en',
          kind: 'subtitles',
          default: index === 0 || sub.language === 'english'
        }));
      
      setSubtitleTracks(tracks);
      console.log('✅ Loaded subtitles:', tracks.length, 'tracks');
    } catch (err) {
      console.error('❌ Failed to load subtitles:', err);
    }
  }, []);

  // Create data URL for subtitle content (simpler than blob URLs)
  const createDataUrl = useCallback((content) => {
    if (!content) return null;
    try {
      return `data:text/vtt;charset=utf-8,${encodeURIComponent(content)}`;
    } catch (err) {
      console.error('Failed to create data URL:', err);
      return null;
    }
  }, []);

  // Handle quality change (for adaptive streams)
  const handleQualityChange = useCallback((quality) => {
    setCurrentQuality(quality);
    
    // For simple players, we might need to reload with different quality
    if (videoRef.current && quality !== 'auto') {
      console.log('🎯 Quality changed to:', quality);
      // Quality switching logic would go here
    }
  }, []);

  // Handle subtitle change
  const handleSubtitleChange = useCallback((subtitleId) => {
    setCurrentSubtitle(subtitleId);
    
    if (!videoRef.current) return;
    
    try {
      // Disable all existing tracks
      const video = videoRef.current;
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
      
      // Enable selected track
      if (subtitleId !== 'off') {
        const trackIndex = subtitleTracks.findIndex(track => track.id === subtitleId);
        if (trackIndex >= 0 && video.textTracks[trackIndex]) {
          video.textTracks[trackIndex].mode = 'showing';
          console.log('✅ Enabled subtitle track:', subtitleId);
        }
      }
    } catch (err) {
      console.error('❌ Failed to change subtitle:', err);
    }
  }, [subtitleTracks]);

  // Auto-start extraction when component mounts
  useEffect(() => {
    if (movieId && (!mediaType === 'tv' || (seasonId && episodeId))) {
      extractStream();
    }
  }, [movieId, mediaType, seasonId, episodeId, extractStream]);

  // Navigation handlers
  const handleNextEpisode = useCallback(() => {
    if (episodeId < maxEpisodes) {
      onEpisodeChange(seasonId, episodeId + 1);
    }
  }, [episodeId, maxEpisodes, seasonId, onEpisodeChange]);

  const handlePreviousEpisode = useCallback(() => {
    if (episodeId > 1) {
      onEpisodeChange(seasonId, episodeId - 1);
    }
  }, [episodeId, seasonId, onEpisodeChange]);

  const handleRetry = useCallback(() => {
    extractStream();
  }, [extractStream]);

  const handleServerChange = useCallback((newServer) => {
    setServer(newServer);
    // Auto-retry with new server
    setTimeout(() => {
      extractStream();
    }, 100);
  }, [extractStream]);

  // Render loading state
  if (loading) {
    return (
      <div className={`${styles.playerContainer} ${styles[deviceType]}`}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <div className={styles.simpleSpinner}></div>
            <h3>Loading Stream...</h3>
            <p>{extractionPhase}</p>
            {extractionProgress > 0 && (
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${extractionProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`${styles.playerContainer} ${styles[deviceType]}`}>
        <div className={styles.errorOverlay}>
          <div className={styles.errorContent}>
            <h3>Stream Error</h3>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={handleRetry} className={styles.retryBtn}>
                Retry
              </button>
              <button 
                onClick={() => handleServerChange(server === "Vidsrc.xyz" ? "Embed.su" : "Vidsrc.xyz")}
                className={styles.switchBtn}
              >
                Switch Server
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main player render
  return (
    <div className={`${styles.playerContainer} ${styles[deviceType]}`}>
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          src={streamUrl}
          controls={useNativeControls}
          autoPlay
          preload="metadata"
          className={styles.videoElement}
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('Video error:', e.target.error);
            setError('Video playback failed. Please try another server.');
          }}
          onLoadStart={() => console.log('Video loading started')}
          onCanPlay={() => console.log('Video ready to play')}
        >
          {/* Native HTML5 subtitle tracks */}
          {subtitleTracks.map((track, index) => (
            <track
              key={track.id}
              kind={track.kind}
              src={track.src}
              label={track.label}
              srcLang={track.srcLang}
              default={track.default && index === 0}
            />
          ))}
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Simple controls for non-TV devices */}
      {!useNativeControls && streamUrl && (
        <div className={styles.controlsBar}>
          {/* Quality selector */}
          {availableQualities.length > 0 && (
            <div className={styles.controlGroup}>
              <label>Quality:</label>
              <select 
                value={currentQuality} 
                onChange={(e) => handleQualityChange(e.target.value)}
                className={styles.simpleSelect}
              >
                <option value="auto">Auto</option>
                {availableQualities.map((quality, index) => (
                  <option key={index} value={quality.label}>
                    {quality.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subtitle selector */}
          {subtitleTracks.length > 0 && (
            <div className={styles.controlGroup}>
              <label>Subtitles:</label>
              <select 
                value={currentSubtitle} 
                onChange={(e) => handleSubtitleChange(e.target.value)}
                className={styles.simpleSelect}
              >
                <option value="off">Off</option>
                {subtitleTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Server selector */}
          <div className={styles.controlGroup}>
            <label>Server:</label>
            <select 
              value={server} 
              onChange={(e) => handleServerChange(e.target.value)}
              className={styles.simpleSelect}
            >
              <option value="Vidsrc.xyz">Vidsrc.xyz</option>
              <option value="Embed.su">Embed.su</option>
            </select>
          </div>

          {/* Episode navigation for TV shows */}
          {mediaType === 'tv' && (
            <div className={styles.episodeControls}>
              <button 
                onClick={handlePreviousEpisode}
                disabled={episodeId <= 1}
                className={styles.navBtn}
              >
                Previous
              </button>
              <span className={styles.episodeInfo}>
                S{seasonId}E{episodeId}
              </span>
              <button 
                onClick={handleNextEpisode}
                disabled={episodeId >= maxEpisodes}
                className={styles.navBtn}
              >
                Next
              </button>
            </div>
          )}

          {/* Back button */}
          <button 
            onClick={() => onBackToShowDetails(seasonId)}
            className={styles.backBtn}
          >
            Back
          </button>
        </div>
      )}

      {/* TV-specific simple overlay controls */}
      {useNativeControls && deviceType === 'tv' && (
        <div className={styles.tvOverlay}>
          <div className={styles.tvControls}>
            {mediaType === 'tv' && (
              <>
                <button 
                  onClick={handlePreviousEpisode}
                  disabled={episodeId <= 1}
                  className={styles.tvBtn}
                >
                  ← Previous Episode
                </button>
                <span className={styles.tvEpisodeInfo}>
                  Season {seasonId} Episode {episodeId}
                </span>
                <button 
                  onClick={handleNextEpisode}
                  disabled={episodeId >= maxEpisodes}
                  className={styles.tvBtn}
                >
                  Next Episode →
                </button>
              </>
            )}
            <button 
              onClick={() => onBackToShowDetails(seasonId)}
              className={styles.tvBackBtn}
            >
              ← Back to Episodes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalMediaPlayer; 