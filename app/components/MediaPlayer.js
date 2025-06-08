'use client'

import React, { useState, useEffect, useRef } from "react";
import styles from "./MediaPlayer.module.css";

const MediaPlayer = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  maxEpisodes,
  onEpisodeChange,
  onBackToShowDetails,
}) => {
  const [server, setServer] = useState("Vidsrc.xyz");
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extractionStep, setExtractionStep] = useState("");
  const [requestId, setRequestId] = useState(null);
  const [streamType, setStreamType] = useState(null);
  const [hlsInstance, setHlsInstance] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1); // -1 = auto
  const [autoSwitching, setAutoSwitching] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0); // Video duration in seconds
  const videoRef = useRef(null);

  // Helper function to format bitrate for display
  const formatBitrate = (bitrate) => {
    const mbps = bitrate / 1000000; // Convert from bps to Mbps
    if (mbps >= 1) {
      return `${mbps.toFixed(1)} Mbps`;
    } else {
      return `${(mbps * 1000).toFixed(0)} Kbps`;
    }
  };

  // Calculate estimated file size based on bitrate and duration
  const calculateFileSize = (bitrate, duration) => {
    if (!duration || duration === 0) return null;
    
    // Convert bitrate from bps to Mbps, then calculate total megabits
    const mbps = bitrate / 1000000;
    const totalMegabits = mbps * duration;
    
    // Convert megabits to megabytes (divide by 8)
    const totalMB = totalMegabits / 8;
    
    if (totalMB >= 1000) {
      // Show in GB
      return `${(totalMB / 1000).toFixed(1)} GB`;
    } else {
      // Show in MB
      return `${totalMB.toFixed(0)} MB`;
    }
  };

  // Format quality display with bitrate and estimated file size
  const formatQualityLabel = (quality) => {
    const bitrateStr = formatBitrate(quality.bitrate);
    const fileSize = calculateFileSize(quality.bitrate, videoDuration);
    
    if (fileSize) {
      return `${quality.label} (${bitrateStr} • ~${fileSize})`;
    } else {
      return `${quality.label} (${bitrateStr})`;
    }
  };

  // Dynamically load HLS.js
  const loadHlsJs = async () => {
    if (typeof window !== 'undefined' && !window.Hls) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      
      return new Promise((resolve, reject) => {
        script.onload = () => resolve(window.Hls);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return window.Hls;
  };

  // Initialize HLS player
  const initializeHlsPlayer = async (streamUrl) => {
    try {
      const Hls = await loadHlsJs();
      
      if (!Hls.isSupported()) {
        throw new Error('HLS is not supported in this browser');
      }

      // Clean up existing instance
      if (hlsInstance) {
        hlsInstance.destroy();
      }

      // Check if this is a direct vidsrc URL (not proxied)
      const isDirectVidsrc = !streamUrl.startsWith('/api/stream-proxy');

      const hlsConfig = {
        debug: process.env.NODE_ENV === 'development',
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: Infinity,
        liveDurationInfinity: false,
        enableSoftwareAES: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        startFragPrefetch: false,
        testBandwidth: true,
        progressive: false,
        lowBufferWatchdogPeriod: 0.5,
        highBufferWatchdogPeriod: 3,
        nudgeMaxRetry: 9,
        maxFragLookUpTolerance: 0.2,
        defaultAudioCodec: undefined,
        cueEndCorrection: true,
      };

      // Add CORS configuration for direct vidsrc URLs
      if (isDirectVidsrc) {
        hlsConfig.xhrSetup = function(xhr, url) {
          // Set clean headers for direct vidsrc access
          xhr.setRequestHeader('User-Agent', navigator.userAgent);
          xhr.setRequestHeader('Accept', '*/*');
          xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
          // No referer or origin headers for vidsrc
        };
        console.log('Configured HLS.js for direct vidsrc access with clean headers');
      }

      const hls = new Hls(hlsConfig);

      // Event listeners
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest parsed, levels:', data.levels);
        setExtractionStep("Stream manifest loaded successfully!");
        
        // Extract quality levels
        const qualityLevels = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : formatBitrate(level.bitrate)
        }));
        
        setQualities(qualityLevels);
        setStreamType('hls');
        
        // Auto-play if possible
        if (videoRef.current) {
          videoRef.current.play().catch(e => console.log('Auto-play prevented:', e));
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('Quality switched to level:', data.level);
        setSelectedQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, destroying HLS instance...');
              hls.destroy();
              setError('Stream playback failed. Please try a different server.');
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        // Fragment loaded successfully
        const loadMethod = isDirectVidsrc ? 'direct access' : 'proxy';
        console.log(`Fragment loaded via ${loadMethod}:`, data.frag.url?.substring(0, 100));
      });

      // Load the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      
      setHlsInstance(hls);
      
    } catch (error) {
      console.error('Failed to initialize HLS player:', error);
      setError(`Failed to initialize video player: ${error.message}`);
    }
  };

  // Handle quality change
  const handleQualityChange = (qualityIndex) => {
    if (hlsInstance && qualityIndex !== selectedQuality) {
      if (qualityIndex === -1) {
        // Auto quality
        hlsInstance.currentLevel = -1;
        setSelectedQuality(-1);
        console.log('Switched to auto quality');
      } else {
        // Manual quality
        hlsInstance.currentLevel = qualityIndex;
        setSelectedQuality(qualityIndex);
        console.log('Switched to quality level:', qualityIndex);
      }
    }
  };

  // Main stream extraction and setup
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      extractAndSetupStream();
    }, 100);

    const extractAndSetupStream = async () => {
      setLoading(true);
      setError(null);
      setStreamUrl(null);
      setStreamType(null);
      setQualities([]);
      setSelectedQuality(-1);
      setAutoSwitching(false);
      setExtractionStep("Initializing...");
      
      // Clean up existing HLS instance
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
      
      try {
        setExtractionStep("Connecting to extraction service...");
        
        // Build API parameters
        const params = new URLSearchParams();
          params.append('mediaType', mediaType);
          params.append('movieId', movieId.toString());
        params.append('server', server === "Vidsrc.xyz" ? "vidsrc.xyz" : "embed.su");
          
          if (mediaType === 'tv') {
            params.append('seasonId', seasonId.toString());
            params.append('episodeId', episodeId.toString());
        }
        
        setExtractionStep("Launching browser automation...");
        
        // Use the serverless function which will proxy to the VM extractor
        const fullUrl = `/api/extract-stream?${params}`;
        
        console.log('🌐 Calling serverless extract proxy:', {
          fullUrl,
          params: params.toString()
        });
        
        const extractResponse = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Extract service response:', {
          status: extractResponse.status,
          statusText: extractResponse.statusText,
          ok: extractResponse.ok,
          headers: Object.fromEntries(extractResponse.headers.entries())
        });
        
        setExtractionStep("Processing response...");
        
        if (!extractResponse.ok) {
          const errorText = await extractResponse.text();
          console.error('❌ Extract service error:', {
            status: extractResponse.status,
            statusText: extractResponse.statusText,
            responseText: errorText
          });
          throw new Error(`Extract service error: ${extractResponse.status} ${extractResponse.statusText}`);
        }
        
        const extractData = await extractResponse.json();
        
        if (extractData.success && extractData.streamUrl) {
          setRequestId(extractData.requestId);
                      setExtractionStep("Stream URL extracted! Preparing playback...");
          
                              // Determine proxy vs direct access based on URL and server
                    const isVidsrc = extractData.server === 'vidsrc.xyz';
                    const isShadowlandschronicles = extractData.streamUrl.includes('shadowlandschronicles');
                    let finalStreamUrl;
                    
                    if (isVidsrc && !isShadowlandschronicles) {
                        // For non-shadowlandschronicles vidsrc URLs, use direct access
                        finalStreamUrl = extractData.streamUrl;
                        console.log('Using direct access for vidsrc.xyz URL - no proxy needed');
                        setExtractionStep("Preparing direct stream access...");
                    } else if (isVidsrc && isShadowlandschronicles) {
                        // For shadowlandschronicles URLs from vidsrc, use proxy with clean headers
                        finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=vidsrc`;
                        console.log('Using proxy for shadowlandschronicles URL - clean headers needed for CORS');
                        setExtractionStep("Setting up proxy for shadowlandschronicles stream...");
                    } else {
                        // For embed.su URLs, use proxy with header masking
                        finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=embed.su`;
                        console.log('Using proxy for embed.su URL - masking headers');
                        setExtractionStep("Setting up proxy for embed.su stream...");
                    }
                    
                    setStreamUrl(finalStreamUrl);
          
          console.log('Stream extraction successful:', {
            server,
            originalUrl: extractData.streamUrl,
            finalUrl: finalStreamUrl,
            isDirect: isVidsrc && !isShadowlandschronicles,
            isShadowlandschronicles,
            routingReason: isVidsrc && !isShadowlandschronicles ? 'direct access' : 
                         isVidsrc && isShadowlandschronicles ? 'proxy for CORS' : 'proxy for embed.su',
            requestId: extractData.requestId
          });
          
          // Determine if this is an HLS stream
          const isHLS = extractData.streamUrl.includes('.m3u8') || extractData.type === 'hls';
          
          if (isHLS) {
            setStreamType('hls');
            setExtractionStep("Setting up HLS player...");
            setLoading(false); // Allow video element to render
          } else {
            // Direct video stream (MP4, etc.)
            setStreamType('mp4');
            setLoading(false);
            setExtractionStep("Direct video stream ready!");
          }
          
        } else {
          const errorMsg = extractData.error || 'Failed to extract stream URL';
          const debug = extractData.debug || {};
          
          console.error('Stream extraction failed:', {
            error: errorMsg,
            requestId: extractData.requestId,
            server,
            mediaType,
            movieId,
            debug
          });
          
          // Check if this was a 404 from vidsrc.xyz and auto-retry with embed.su
          if (server === "Vidsrc.xyz" && debug.wasNavigationError && debug.navigationStatus === 404) {
            console.log('vidsrc.xyz returned 404, automatically switching to Embed.su...');
            setAutoSwitching(true);
            setExtractionStep("Content not found on vidsrc.xyz, switching to Embed.su...");
            
            // Give user time to see the message, then switch servers
            setTimeout(() => {
              setAutoSwitching(false);
              setServer("Embed.su");
            }, 2000);
            return; // Exit without setting error - this will trigger useEffect again with new server
          }
          
          setError(errorMsg);
          setLoading(false);
        }
      } catch (err) {
        console.error('Stream extraction error:', {
          error: err.message,
          server,
          mediaType,
          movieId,
          step: extractionStep
        });
        
        let errorMessage = 'Failed to load stream';
        if (err.name === 'AbortError') {
          errorMessage = 'Stream extraction timeout - please try again';
        } else if (err.message.includes('HTTP')) {
          errorMessage = `Server error: ${err.message}`;
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error - check your connection';
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    return () => {
      clearTimeout(timeoutId);
    };
  }, [server, mediaType, movieId, seasonId, episodeId]);

  // Initialize HLS when video element becomes available
  useEffect(() => {
    if (streamUrl && streamType === 'hls' && videoRef.current && !hlsInstance) {
      console.log('Video element ready, initializing HLS...');
      initializeHlsPlayer(streamUrl);
    }
  }, [streamUrl, streamType, videoRef.current]);

  // Initialize direct video streams
  useEffect(() => {
    if (streamUrl && streamType === 'mp4' && videoRef.current) {
      console.log('Setting up direct video stream...');
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(e => console.log('Auto-play prevented:', e));
    }
  }, [streamUrl, streamType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, []);

  const handleServerChange = (event) => {
    const newServer = event.target.value;
    console.log(`Switching server from ${server} to ${newServer}`);
    setServer(newServer);
  };

  const handleRetry = () => {
    console.log('Retrying stream extraction...');
    setError(null);
    setLoading(true);
    // Force re-render to trigger useEffect
    setServer(prev => prev);
  };

  const handleNextEpisode = () => {
    if (episodeId < maxEpisodes) {
      console.log(`Moving to next episode: S${seasonId}E${episodeId + 1}`);
      onEpisodeChange(seasonId, episodeId + 1);
    }
  };

  const handlePreviousEpisode = () => {
    if (episodeId > 1) {
      console.log(`Moving to previous episode: S${seasonId}E${episodeId - 1}`);
      onEpisodeChange(seasonId, episodeId - 1);
    }
  };

  const handleBackToShowDetails = () => {
    console.log(`Returning to show details for season ${seasonId}`);
    onBackToShowDetails(seasonId);
  };

  const handleVideoError = (e) => {
    console.error('Video playback error:', {
      error: e.target.error,
      networkState: e.target.networkState,
      readyState: e.target.readyState,
      src: e.target.src?.substring(0, 100),
      requestId
    });
    
    let errorMessage = 'Video playback failed';
    if (e.target.error) {
      switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case e.target.error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error during video loading';
          break;
        case e.target.error.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported';
          break;
        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source not supported';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    setError(`${errorMessage}. Try switching servers or refreshing the page.`);
  };

  return (
    <div className={styles.mediaContainer}>
      <div className={styles.mediaPlayer}>
        {(loading || autoSwitching) && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loadingText}>
              {autoSwitching ? (
                <>
                  <p>🔄 Switching to Embed.su...</p>
                  <p className={styles.loadingStep}>Content not found on vidsrc.xyz</p>
                  <p className={styles.loadingHint}>Trying backup server automatically</p>
                </>
              ) : (
                                  <>
              <p>Extracting stream from {server}...</p>
              {extractionStep && (
                      <p className={styles.loadingStep}>{extractionStep}</p>
              )}
                    <p className={styles.loadingHint}>This may take 15-30 seconds</p>
              {requestId && (
                      <p className={styles.requestId}>Request ID: {requestId}</p>
                    )}
                  </>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <div className={styles.errorContainer}>
            <h3>Streaming Error</h3>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.errorActions}>
              <button onClick={handleRetry} className={styles.retryButton}>
                🔄 Retry
              </button>
              <button 
                onClick={() => setServer(server === "Vidsrc.xyz" ? "Embed.su" : "Vidsrc.xyz")} 
                className={styles.switchServerButton}
              >
                🔀 Try {server === "Vidsrc.xyz" ? "Embed.su" : "Vidsrc.xyz"}
              </button>
            </div>
            {requestId && (
              <p className={styles.errorRequestId}>Request ID: {requestId}</p>
            )}
          </div>
        )}
        
        {streamUrl && !loading && !error && !autoSwitching && (
          <div className={styles.videoContainer}>
            {/* Quality Selector for HLS streams */}
            {streamType === 'hls' && qualities.length > 0 && (
              <div className={styles.qualitySelector}>
                <label htmlFor="quality" className={styles.qualityLabel}>Quality: </label>
                <select 
                  id="quality" 
                  value={selectedQuality} 
                  onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                  className={styles.qualityDropdown}
                >
                  <option value={-1}>Auto</option>
                  {qualities.map((quality, index) => (
                    <option key={index} value={index}>
                      {formatQualityLabel(quality)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className={styles.videoWrapper}>
            <video
              ref={videoRef}
              controls
              autoPlay
              width="100%"
              height="100%"
                className={styles.videoElement}
              onError={handleVideoError}
              onLoadStart={() => console.log('Video loading started')}
              onCanPlay={() => console.log('Video can start playing')}
              onPlaying={() => console.log('Video playback started')}
                onLoadedMetadata={(e) => {
                  const duration = e.target.duration;
                  setVideoDuration(duration);
                  console.log(`Video duration loaded: ${Math.round(duration / 60)} minutes`);
                }}
                onDurationChange={(e) => {
                  const duration = e.target.duration;
                  setVideoDuration(duration);
                  console.log(`Video duration updated: ${Math.round(duration / 60)} minutes`);
                }}
              crossOrigin="anonymous"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
            </div>
            
            {/* Stream Info */}
            {streamType && (
              <div className={styles.streamInfo}>
                <span className={styles.streamType}>
                  {streamType === 'hls' ? '📺 HLS Stream' : '🎥 Direct Stream'}
                </span>
                <div className={styles.streamDetails}>
                {qualities.length > 0 && (
                    <span className={styles.qualityCount}>
                      {qualities.length} qualities available
                    </span>
                  )}
                  {videoDuration > 0 && selectedQuality >= 0 && qualities[selectedQuality] && (
                    <span className={styles.estimatedSize}>
                      Current: ~{calculateFileSize(qualities[selectedQuality].bitrate, videoDuration)}
                    </span>
                  )}
                  {videoDuration > 0 && selectedQuality === -1 && qualities.length > 0 && (
                    <span className={styles.estimatedSize}>
                      Auto Quality (~{Math.round(videoDuration / 60)} min video)
                  </span>
                )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Media Controls */}
      {mediaType === "tv" && (
        <div className={styles.mediaControls}>
          <button
            onClick={handlePreviousEpisode}
            disabled={episodeId <= 1 || loading || autoSwitching}
            className={`${styles.controlButton} ${episodeId <= 1 ? styles.disabled : ""}`}
            title={episodeId <= 1 ? "No previous episode" : `Go to Episode ${episodeId - 1}`}
          >
            ◄ Previous Episode
          </button>
          
          <button
            onClick={handleNextEpisode}
            disabled={episodeId >= maxEpisodes || loading || autoSwitching}
            className={`${styles.controlButton} ${episodeId >= maxEpisodes ? styles.disabled : ""}`}
            title={episodeId >= maxEpisodes ? "No next episode" : `Go to Episode ${episodeId + 1}`}
          >
            Next Episode ►
          </button>
        </div>
      )}
      
      {/* Other Options */}
      <div className={styles.otherOptions}>
        <div className={styles.optionsRow}>
        <button 
          onClick={handleBackToShowDetails} 
            className={styles.controlButton}
            disabled={loading || autoSwitching}
        >
          ◄ Back to Show Details
        </button>
        
          <div className={styles.serverSelector}>
            <label htmlFor="server" className={styles.serverLabel}>Choose Server: </label>
          <select 
            id="server" 
            value={server} 
            onChange={handleServerChange}
              disabled={loading || autoSwitching}
            title="Select streaming server"
              className={styles.serverDropdown}
          >
              <option value="Vidsrc.xyz">🎯 Vidsrc.xyz (Primary)</option>
              <option value="Embed.su">🔄 Embed.su (Backup)</option>
          </select>
          </div>
        </div>
        
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className={styles.debugInfo}>
            <p>Media: {mediaType === 'tv' ? `S${seasonId}E${episodeId}` : 'Movie'}</p>
            <p>ID: {movieId}</p>
            <p>Server: {server}</p>
            {requestId && <p>Request: {requestId}</p>}
            {streamType && <p>Type: {streamType}</p>}
            {hlsInstance && <p>HLS: Active</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
