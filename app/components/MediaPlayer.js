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
  
  // Enhanced loading state with real-time progress
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('initializing');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(20);
  const [loadingStartTime, setLoadingStartTime] = useState(null);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [progressEventSource, setProgressEventSource] = useState(null);
  const [extractionCompleted, setExtractionCompleted] = useState(false);
  
  const videoRef = useRef(null);

  // Fun facts to rotate through during loading
  const funFacts = [
    "💡 We're using advanced browser automation to extract your stream securely!",
    "🔒 Your privacy is protected - all extraction happens on our secure servers.",
    "🎬 Did you know? We support multiple streaming sources for maximum reliability.",
    "⚡ Our service processes over 10,000 stream requests daily!",
    "🛡️ Advanced anti-bot measures help us bypass streaming restrictions.",
    "🌐 Stream extraction typically takes 15-25 seconds for the best quality.",
    "🎯 We automatically detect the highest quality stream available.",
    "🔄 If one server fails, we'll automatically try backup sources.",
    "📺 HLS streams provide adaptive quality based on your connection.",
    "🚀 Our VM service ensures consistent performance and reliability."
  ];

  // Loading phases with estimated durations
  const loadingPhases = {
    initializing: { label: 'Initializing extraction service', progress: 5 },
    connecting: { label: 'Connecting to streaming server', progress: 15 },
    navigating: { label: 'Setting up browser environment', progress: 35 },
    bypassing: { label: 'Bypassing security measures', progress: 50 },
    extracting: { label: 'Extracting stream URLs', progress: 80 },
    validating: { label: 'Validating stream quality', progress: 90 },
    finalizing: { label: 'Preparing playback', progress: 95 },
    complete: { label: 'Stream ready!', progress: 100 }
  };

  // Timer for elapsed time tracking only (no progress simulation)
  useEffect(() => {
    if (loading && !loadingStartTime) {
      setLoadingStartTime(Date.now());
    }
    
    if (loading && loadingStartTime) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - loadingStartTime) / 1000);
        setTimeElapsed(elapsed);
        
        // Calculate estimated time remaining based on current progress
        if (loadingProgress > 0) {
          const progressPercentage = loadingProgress / 100;
          const estimatedTotal = elapsed / progressPercentage;
          const remaining = Math.max(0, Math.round(estimatedTotal - elapsed));
          setEstimatedTimeRemaining(remaining);
        } else {
          // Initial estimate before progress starts
          setEstimatedTimeRemaining(20);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [loading, loadingStartTime, loadingProgress]);

  // Timer for rotating fun facts
  useEffect(() => {
    if (loading) {
      const factTimer = setInterval(() => {
        setCurrentFactIndex(prev => (prev + 1) % funFacts.length);
      }, 4000); // Change fact every 4 seconds
      
      return () => clearInterval(factTimer);
    }
  }, [loading, funFacts.length]);

  // Remove conflicting progress updates that cause flickering

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
        
        // Extract quality levels
        const qualityLevels = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : formatBitrate(level.bitrate)
        }));
        
        setQualities(qualityLevels);
        
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
      
      // Reset enhanced loading states
      setLoadingProgress(0);
      setLoadingPhase('initializing');
      setTimeElapsed(0);
      setEstimatedTimeRemaining(20);
      setLoadingStartTime(null); // Will be set when timer starts
      setCurrentFactIndex(0);
      setExtractionCompleted(false);
      
      // Local tracking variables to avoid race conditions
      let localExtractionCompleted = false;
      let localProgress = 0;
      
      // Clean up existing HLS instance
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
      
      // Close existing progress stream
      if (progressEventSource) {
        progressEventSource.close();
        setProgressEventSource(null);
      }
      
      try {
        // Build API parameters for progress stream
        const params = new URLSearchParams();
        params.append('mediaType', mediaType);
        params.append('movieId', movieId.toString());
        params.append('server', server === "Vidsrc.xyz" ? "vidsrc.xyz" : "embed.su");
        
        if (mediaType === 'tv') {
          params.append('seasonId', seasonId.toString());
          params.append('episodeId', episodeId.toString());
        }
        
        // Create Server-Sent Events connection for real-time progress
        const progressUrl = `/api/extract-stream-progress?${params}`;
        console.log('🌐 Starting real-time progress stream:', progressUrl);
        
        const eventSource = new EventSource(progressUrl);
        setProgressEventSource(eventSource);
        
        console.log('🔌 EventSource created:', progressUrl);
        console.log('🔌 EventSource readyState:', eventSource.readyState);
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          if (localProgress < 100 && !localExtractionCompleted) {
            console.error('❌ Extraction timeout after 90 seconds');
            setError('Extraction timeout - please try again or switch servers');
            setLoading(false);
            eventSource.close();
            setProgressEventSource(null);
          }
        }, 90000); // 90 second timeout
        
        eventSource.onopen = () => {
          console.log('🟢 EventSource connection opened');
        };

        eventSource.onmessage = (event) => {
          try {
            console.log('📨 Raw EventSource message received:', event.data);
            const data = JSON.parse(event.data);
            console.log('📡 VM Progress update:', data);
            
            // Update local tracking variables immediately
            if (typeof data.progress === 'number') {
              localProgress = data.progress;
            }
            
            // Update UI based on real-time VM progress
            if (data.phase) setLoadingPhase(data.phase);
            if (typeof data.progress === 'number') setLoadingProgress(data.progress);
            if (data.message) setExtractionStep(data.message);
            
            // Time remaining is calculated by the timer useEffect, no need to duplicate here
            
            // Handle completion
            if (data.phase === 'complete') {
              console.log('🎯 Completion phase detected!', data);
              
              // Mark completion immediately in local variable
              localExtractionCompleted = true;
              localProgress = 100;
              
              if (!data.result) {
                console.error('❌ No result data in completion event:', data);
                setError('Completion event missing result data');
                clearTimeout(timeoutId);
                setLoading(false);
                eventSource.close();
                setProgressEventSource(null);
                return;
              }
              
              console.log('🎉 Processing completion data:', data.result);
              
              const extractData = data.result;
              
              // Validate essential data
              if (!extractData.success || !extractData.streamUrl) {
                console.error('❌ Invalid completion data:', extractData);
                setError('Invalid stream data received from extraction service');
                setLoading(false);
                eventSource.close();
                setProgressEventSource(null);
                return;
              }
              
              setRequestId(extractData.requestId);
              
              // Process stream URL
              const isVidsrc = extractData.server === 'vidsrc.xyz';
              const isShadowlandschronicles = extractData.streamUrl.includes('shadowlandschronicles');
              let finalStreamUrl;
              
              if (isVidsrc && !isShadowlandschronicles) {
                finalStreamUrl = extractData.streamUrl;
                console.log('Using direct access for vidsrc.xyz URL');
              } else if (isVidsrc && isShadowlandschronicles) {
                finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=vidsrc`;
                console.log('Using proxy for shadowlandschronicles URL');
              } else {
                finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=embed.su`;
                console.log('Using proxy for embed.su URL');
              }
              
              console.log('🔗 Setting stream URL:', finalStreamUrl.substring(0, 100) + '...');
              setStreamUrl(finalStreamUrl);
              
              // Determine stream type
              const isHLS = extractData.streamUrl.includes('.m3u8') || extractData.type === 'hls';
              console.log('🎥 Setting stream type:', isHLS ? 'hls' : 'mp4');
              setStreamType(isHLS ? 'hls' : 'mp4');
              
              console.log('✅ Stream extraction completed successfully:', {
                server,
                originalUrl: extractData.streamUrl,
                finalUrl: finalStreamUrl,
                streamType: isHLS ? 'hls' : 'mp4',
                requestId: extractData.requestId,
                totalFound: extractData.totalFound,
                m3u8Count: extractData.m3u8Count
              });
              
              // Mark extraction as completed
              setExtractionCompleted(true);
              
              // Complete loading after brief delay
              setTimeout(() => {
                clearTimeout(timeoutId);
                setLoading(false);
                eventSource.close();
                setProgressEventSource(null);
              }, 800);
              
              return; // Exit handler after successful completion
            }
            
            // Handle auto-switch scenario
            if (data.phase === 'autoswitch') {
              console.log('🔄 Auto-switching server:', data);
              setAutoSwitching(true);
              setExtractionStep(data.message);
              
              // Switch to embed.su after brief delay
              setTimeout(() => {
                clearTimeout(timeoutId);
                setAutoSwitching(false);
                setServer("Embed.su");
                eventSource.close();
                setProgressEventSource(null);
              }, 2000);
              return;
            }
            
            // Handle errors
            if (data.error) {
              console.error('❌ Real-time progress error:', data);
              clearTimeout(timeoutId);
              setError(data.message || 'Stream extraction failed');
              setLoading(false);
              eventSource.close();
              setProgressEventSource(null);
            }
            
          } catch (parseError) {
            console.error('❌ Error parsing progress data:', parseError);
            console.error('Raw event data:', event.data);
            clearTimeout(timeoutId);
            setError('Failed to process extraction progress data');
            setLoading(false);
            eventSource.close();
            setProgressEventSource(null);
          }
        };
        
        eventSource.onerror = (error) => {
          console.log('🔔 EventSource error event:', error);
          console.log('EventSource readyState:', eventSource.readyState);
          console.log('Current loading progress (state):', loadingProgress);
          console.log('Current loading progress (local):', localProgress);
          console.log('Current loading phase:', loadingPhase);
          console.log('Extraction completed (state):', extractionCompleted);
          console.log('Extraction completed (local):', localExtractionCompleted);
          
          // Check the readyState to understand what happened
          if (eventSource.readyState === EventSource.CLOSED) {
            console.log('🔴 EventSource was closed by server (normal after completion)');
            
            // If extraction completed (using local variable for immediate check), this is expected
            if (localExtractionCompleted || localProgress >= 100 || extractionCompleted || loadingProgress >= 100) {
              console.log('✅ Server closed connection after successful completion - this is normal');
              return; // Don't treat this as an error
            }
          }
          
          // Only treat as actual error if extraction hasn't completed and progress is low
          if (!localExtractionCompleted && localProgress < 90 && !extractionCompleted && loadingProgress < 90) {
            console.error('❌ Genuine connection error occurred');
            clearTimeout(timeoutId);
            setError(`Connection lost during extraction (progress: ${localProgress || loadingProgress}%)`);
            setLoading(false);
          } else {
            console.log('✅ Ignoring error - extraction was successful or nearly complete');
          }
          
          eventSource.close();
          setProgressEventSource(null);
        };
        
      } catch (err) {
        console.error('Stream extraction setup error:', err);
        setError('Failed to initialize stream extraction');
        setLoading(false);
      }
    };

    return () => {
      clearTimeout(timeoutId);
    };
  }, [server, mediaType, movieId, seasonId, episodeId]);

  // Initialize HLS when video element becomes available
  useEffect(() => {
    console.log('🎬 HLS initialization useEffect triggered:', {
      streamUrl: streamUrl ? streamUrl.substring(0, 100) + '...' : null,
      streamType,
      videoRefCurrent: !!videoRef.current,
      hlsInstance: !!hlsInstance,
      shouldInitialize: streamUrl && streamType === 'hls' && videoRef.current && !hlsInstance
    });
    
    if (streamUrl && streamType === 'hls' && videoRef.current && !hlsInstance) {
      console.log('🎬 Video element ready, initializing HLS...');
      initializeHlsPlayer(streamUrl);
    }
  }, [streamUrl, streamType, videoRef.current]);

  // Additional effect to handle case where video ref becomes available after stream URL is set
  useEffect(() => {
    if (videoRef.current && streamUrl && streamType === 'hls' && !hlsInstance) {
      console.log('🎬 Video ref became available after stream URL was set, initializing HLS...');
      initializeHlsPlayer(streamUrl);
    }
  }, [videoRef.current]);

  // Initialize direct video streams
  useEffect(() => {
    console.log('🎬 Direct video initialization useEffect triggered:', {
      streamUrl: streamUrl ? streamUrl.substring(0, 100) + '...' : null,
      streamType,
      videoRefCurrent: !!videoRef.current,
      shouldInitialize: streamUrl && streamType === 'mp4' && videoRef.current
    });
    
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
      if (progressEventSource) {
        progressEventSource.close();
      }
    };
  }, [hlsInstance, progressEventSource]);

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
            <div className={styles.enhancedLoadingInterface}>
              {/* Main spinner with progress ring */}
              <div className={styles.progressSpinnerContainer}>
                <div className={styles.loadingSpinner}></div>
                <svg className={styles.progressRing} width="120" height="120">
                  <circle
                    className={styles.progressRingBackground}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.2)"
                    strokeWidth="3"
                  />
                  <circle
                    className={styles.progressRingProgress}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(loadingProgress / 100) * 314} 314`}
                    transform="rotate(-90 60 60)"
                    data-complete={loadingProgress >= 100}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Progress percentage */}
                <div 
                  className={styles.progressPercentage}
                  data-complete={loadingProgress >= 100}
                >
                  {Math.round(loadingProgress)}%
                </div>
              </div>

              {/* Status information */}
              <div className={styles.loadingStatus}>
                {autoSwitching ? (
                  <>
                    <h3 className={styles.loadingTitle}>🔄 Switching Server</h3>
                    <p className={styles.loadingPhase}>Content not found on vidsrc.xyz</p>
                    <p className={styles.loadingStep}>Trying backup server automatically</p>
                  </>
                ) : (
                  <>
                    <h3 className={styles.loadingTitle}>
                      {loadingProgress >= 100 ? '✅ Extraction Complete!' : `🎯 Extracting from ${server}`}
                    </h3>
                    <p className={styles.loadingPhase}>
                      {loadingProgress >= 100 ? 'Starting video playback...' : (loadingPhases[loadingPhase]?.label || 'Processing...')}
                    </p>
                    {extractionStep && (
                      <p className={styles.loadingStep}>{extractionStep}</p>
                    )}
                    
                    {/* Time information */}
                    <div className={styles.timeInfo}>
                      <div className={styles.timeItem}>
                        <span className={styles.timeLabel}>Elapsed:</span>
                        <span className={styles.timeValue}>{timeElapsed}s</span>
                      </div>
                      <div className={styles.timeItem}>
                        <span className={styles.timeLabel}>Remaining:</span>
                        <span className={styles.timeValue}>~{estimatedTimeRemaining}s</span>
                      </div>
                    </div>

                    {/* Phase progress indicators */}
                    <div className={styles.phaseIndicators}>
                      {Object.entries(loadingPhases).map(([phase, info], index) => {
                        // Use loadingProgress to determine status instead of phase comparison
                        const isCompleted = loadingProgress > info.progress;
                        const isActive = loadingPhase === phase && loadingProgress <= info.progress;
                        
                        return (
                          <div 
                            key={phase}
                            className={`${styles.phaseIndicator} ${
                              isActive ? styles.active : 
                              isCompleted ? styles.completed : ''
                            }`}
                          >
                            <div className={styles.phaseIcon}>
                              {isCompleted ? '✓' : 
                               isActive ? '⟳' : '·'}
                            </div>
                            <span className={styles.phaseLabel}>{info.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Fun facts to keep user engaged */}
                    <div className={styles.funFacts}>
                      <p className={styles.funFact} key={currentFactIndex}>
                        {funFacts[currentFactIndex]}
                      </p>
                    </div>
                  </>
                )}

                {requestId && (
                  <p className={styles.requestId}>Request ID: {requestId}</p>
                )}
              </div>
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
        
        {/* Video element - always render to ensure ref is available */}
        <div className={styles.videoContainer} style={{ display: (streamUrl && !loading && !error && !autoSwitching) ? 'block' : 'none' }}>            
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

              {/* Overlay Controls */}
              <div className={styles.videoOverlay}>
                {/* Quality Selector for HLS streams */}
                {streamType === 'hls' && qualities.length > 0 && (
                  <div className={styles.qualitySelector}>
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

                {/* Server Selector */}
                <div className={styles.serverSelector}>
                  <select 
                    id="server" 
                    value={server} 
                    onChange={handleServerChange}
                    disabled={loading || autoSwitching}
                    title="Select streaming server"
                    className={styles.serverDropdown}
                  >
                    <option value="Vidsrc.xyz">🎯 Vidsrc.xyz</option>
                    <option value="Embed.su">🔄 Embed.su</option>
                  </select>
                </div>

                {/* Compact Stream Info */}
                {streamType && (
                  <div className={styles.streamInfo}>
                    <span className={styles.streamType}>
                      {streamType === 'hls' ? '📺 HLS' : '🎥 Direct'}
                    </span>
                    {qualities.length > 0 && (
                      <span className={styles.qualityCount}>
                        {qualities.length} qualities
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
      
      {/* Compact Controls Bar */}
      <div className={styles.compactControls}>
        <button 
          onClick={handleBackToShowDetails} 
          className={styles.compactButton}
          disabled={loading || autoSwitching}
        >
          ◄ Back
        </button>
        
        {mediaType === "tv" && (
          <div className={styles.episodeControls}>
            <button
              onClick={handlePreviousEpisode}
              disabled={episodeId <= 1 || loading || autoSwitching}
              className={`${styles.compactButton} ${episodeId <= 1 ? styles.disabled : ""}`}
              title={episodeId <= 1 ? "No previous episode" : `Previous Episode`}
            >
              ◄
            </button>
            <span className={styles.episodeInfo}>S{seasonId}E{episodeId}</span>
            <button
              onClick={handleNextEpisode}
              disabled={episodeId >= maxEpisodes || loading || autoSwitching}
              className={`${styles.compactButton} ${episodeId >= maxEpisodes ? styles.disabled : ""}`}
              title={episodeId >= maxEpisodes ? "No next episode" : `Next Episode`}
            >
              ►
            </button>
          </div>
        )}

        {/* Debug Info - Minimal */}
        {process.env.NODE_ENV === 'development' && requestId && (
          <span className={styles.debugId}>ID: {requestId.slice(-8)}</span>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
