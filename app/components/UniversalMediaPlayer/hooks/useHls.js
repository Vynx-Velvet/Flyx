import { useState, useEffect } from 'react';
import { createHlsLogger } from '../../../utils/logging/HlsLogger.js';

// Dynamically load the HLS.js script
const loadHlsJs = () => {
  if (typeof window !== 'undefined' && !window.Hls) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      script.onload = () => resolve(window.Hls);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return Promise.resolve(window.Hls);
};

export const useHls = (streamUrl, videoRef, streamType, activeSubtitle) => {
  const [hls, setHls] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('0'); // Default to highest quality (index 0)
  const [segmentErrors, setSegmentErrors] = useState(new Map()); // Track segment errors
  const [errorRecoveryState, setErrorRecoveryState] = useState({
    networkRetries: 0,
    mediaRetries: 0,
    fullRestarts: 0,
    lastErrorTime: 0,
    consecutiveErrors: 0,
    qualityDowngrades: 0,
    lastQualityChange: 0
  }); // Enhanced error recovery tracking
  const [bufferHealth, setBufferHealth] = useState({
    stalls: 0,
    lastStallTime: 0,
    gapJumps: 0,
    averageSegmentLoadTime: 0,
    segmentLoadTimes: []
  }); // Buffer health monitoring
  
  // Enhanced logging for HLS events
  const [hlsLogger] = useState(() => createHlsLogger(streamUrl));
  
  useEffect(() => {
    let hlsInstance = null;
    let gapJumpTimer = null;

    const initializeHls = async () => {
      try {
        const Hls = await loadHlsJs();
        if (!Hls || !Hls.isSupported() || !videoRef.current) {
          console.warn('HLS.js is not supported or video element is not available.');
          return;
        }

        const isDirectAccess = streamUrl && !streamUrl.startsWith('/api/');

        // STABLE HLS configuration - focused on uninterrupted playback
        const hlsConfig = {
          // DISABLE ALL AUTOMATIC QUALITY SWITCHING
          autoLevelEnabled: false,         // COMPLETELY DISABLE automatic quality switching
          startLevel: -1,                  // Will be manually set to user's choice
          capLevelToPlayerSize: false,     // Don't cap level based on player size
          
          // DISABLE ALL NATIVE SUBTITLE RENDERING
          renderTextTracksNatively: false,
          subtitleTrackController: false,
          subtitleDisplay: false,
          enableWebVTT: false,
          
          // LARGE STABLE BUFFERING - prioritize smooth playback over memory
          maxBufferLength: 120,            // 2 minutes forward buffer
          maxMaxBufferLength: 600,         // 10 minutes maximum buffer
          maxBufferSize: 120 * 1000 * 1000, // 120MB buffer size
          maxBufferHole: 1.0,              // Allow 1 second holes without jumping
          backBufferLength: 90,            // Keep 90 seconds of back buffer
          
          // CONSERVATIVE LOADING SETTINGS - prevent interruptions
          maxLoadingDelay: 4,              // Wait 4 seconds before declaring error
          maxRetryDelay: 8,                // Up to 8 seconds between retries
          retryDelay: 1.0,                 // Start with 1 second retry delay
          
          // PATIENT FRAGMENT LOADING - no aggressive skipping
          fragLoadingRetryDelay: 2000,     // 2 seconds between fragment retries
          fragLoadingMaxRetry: 6,          // Try 6 times before giving up
          fragLoadingMaxRetryTimeout: 30000, // 30 second timeout - very patient
          
          // HANDLE FRAGMENT PARSING ERRORS GRACEFULLY
          enableWorker: true,              // Use worker for better error handling
          enableSoftwareAES: true,         // Enable software AES for better compatibility
          stretchShortVideoFragment: true, // Stretch short fragments to full duration
          maxFragLookUpTolerance: 0.25,     // Tolerance for fragment lookup
          
          // STABLE MANIFEST LOADING
          manifestLoadingRetryDelay: 2000,
          manifestLoadingMaxRetry: 10,
          manifestLoadingMaxRetryTimeout: 30000,
          
          // STABLE LEVEL LOADING
          levelLoadingRetryDelay: 2000,
          levelLoadingMaxRetry: 10,
          levelLoadingMaxRetryTimeout: 30000,
          
          // DISABLE AGGRESSIVE GAP JUMPING
          nudgeOffset: 0,                  // Disable nudging
          nudgeMaxRetry: 0,                // No nudge retries
          maxSeekHole: 5,                  // Allow 5 second gaps without jumping (increased from 2)
          lowLatencyMode: false,           // Disable low latency mode which can cause instability
          
          // DISABLE ABR (Adaptive Bitrate) - manual quality only
          abrEwmaFastLive: 99999,          // Effectively disable ABR
          abrEwmaSlowLive: 99999,          // Effectively disable ABR
          abrEwmaFastVoD: 99999,           // Effectively disable ABR
          abrEwmaSlowVoD: 99999,           // Effectively disable ABR
          abrEwmaDefaultEstimate: 5000000, // High default to prevent downgrade
          abrBandWidthFactor: 0.0,         // Completely disable (0.0)
          abrBandWidthUpFactor: 0.0,       // Completely disable (0.0)
          abrMaxWithRealBitrate: false,    // Don't use real bitrate for ABR
          
          // COMPLETELY DISABLE AUTO-LEVEL SWITCHING
          capLevelToPlayerSize: false,     // Don't cap level based on player size
          maxStarvationDelay: 99999,       // Effectively disable starvation delay
          maxLoadingDelay: 99999,          // Effectively disable loading delay
          testBandwidth: false,            // Don't test bandwidth
          
          // STABLE SETTINGS
          enableWorker: true,              // Use worker for better performance
          lowLatencyMode: false,           // Disable low latency for stability
          progressive: true,               // Enable progressive streaming
          
          // AUTOPLAY SETTINGS
          autoStartLoad: true,             // Automatically start loading
          startPosition: -1,               // Start from beginning
          
          // ERROR RECOVERY - SIMPLE AND STABLE
          enableSoftwareAES: true,
          startFragPrefetch: true,         // Prefetch fragments for smoother playback
          testBandwidth: false,            // Don't test bandwidth (no quality changes)
        };

        // Source-specific header management for different streaming sources
        const getSourceSpecificHeaders = (url) => {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.toLowerCase();
          
          // Base headers for all requests
          const baseHeaders = {
            'User-Agent': navigator.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9'
          };
          
          // vidsrc.xyz sources - minimal headers (they're suspicious of excessive headers)
          if (hostname.includes('vidsrc') || hostname.includes('cloudnestra')) {
            console.log('🎬 HLS Headers: Using minimal headers for vidsrc/cloudnestra source');
            return {
              'User-Agent': baseHeaders['User-Agent'],
              'Accept': baseHeaders['Accept']
            };
          }
          
          // shadowlandschronicles.com - requires specific referer headers
          if (hostname.includes('shadowlandschronicles')) {
            console.log('🎬 HLS Headers: Using shadowlandschronicles-specific headers');
            return {
              ...baseHeaders,
              'Referer': 'https://cloudnestra.com/',
              'Origin': 'https://cloudnestra.com'
            };
          }
          
          // embed.su sources - full diplomatic treatment
          if (hostname.includes('embed.su') || hostname.includes('embedsu')) {
            console.log('🎬 HLS Headers: Using full headers for embed.su source');
            return {
              ...baseHeaders,
              'Referer': 'https://embed.su/',
              'Origin': 'https://embed.su',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            };
          }
          
          // Default headers for unknown sources
          console.log('🎬 HLS Headers: Using default headers for unknown source:', hostname);
          return baseHeaders;
        };

        if (isDirectAccess) {
            hlsConfig.xhrSetup = function(xhr, url) {
                const headers = getSourceSpecificHeaders(url);
                
                // Apply headers based on source detection
                Object.entries(headers).forEach(([key, value]) => {
                  xhr.setRequestHeader(key, value);
                });
                
                console.log('🎬 HLS config: Applied source-specific headers for:', new URL(url).hostname, headers);
            };
            console.log('🎬 HLS config: Using direct access with source-specific header management.');
        }

        hlsInstance = new Hls(hlsConfig);
        
        // Log HLS initialization
        hlsLogger.logHlsInitialization(hlsConfig, streamUrl);

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoRef.current);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('Manifest parsed:', data.levels.length, 'quality levels');
          
          // Sort levels by height (resolution) in descending order
          const sortedLevels = [...data.levels].sort((a, b) => {
            if (b.height !== a.height) {
              return b.height - a.height;
            }
            return b.bitrate - a.bitrate;
          });
          
          // Create quality options
          const levels = sortedLevels.map((level, sortedIndex) => {
            const originalIndex = data.levels.findIndex(l =>
              l.height === level.height &&
              l.bitrate === level.bitrate &&
              l.bandwidth === level.bandwidth
            );
            
            return {
              id: originalIndex,
              height: level.height,
              bitrate: level.bitrate,
              label: `${level.height}p`,
              bandwidth: level.bandwidth,
              sortedIndex: sortedIndex
            };
          });
          
          setQualities(levels);
          
          // DEFAULT TO MIDDLE QUALITY FOR STABILITY
          const middleQualityIndex = Math.floor(levels.length / 2);
          const defaultQuality = levels[middleQualityIndex] || levels[0];
          
          if (defaultQuality) {
            // LOCK THE QUALITY - no automatic changes
            hlsInstance.autoLevelEnabled = false;
            hlsInstance.startLevel = defaultQuality.id;
            hlsInstance.currentLevel = defaultQuality.id;
            hlsInstance.nextLevel = defaultQuality.id;
            hlsInstance.loadLevel = defaultQuality.id;
            hlsInstance.autoLevelCapping = defaultQuality.id; // Lock auto level capping
            hlsInstance.capLevelToPlayerSize = false; // Ensure player size capping is disabled
            setCurrentQuality(defaultQuality.id.toString());
            console.log(`Quality locked to: ${defaultQuality.label} (${defaultQuality.bitrate} bps)`);
            console.log('Auto quality switching is COMPLETELY DISABLED');
          }
        });
        
        // IGNORE AUTOMATIC LEVEL SWITCHES
        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          // Only log, don't allow automatic switches
          console.log('Level switched to:', data.level, '(should be manual only)');
        });

        // ENHANCED ERROR HANDLING - better recovery
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data.type, data.details, data.fatal);
          
          // Handle fragment parsing errors specifically
          if (data.details === 'fragParsingError') {
            console.warn('Fragment parsing error detected - attempting recovery');
            
            // For non-fatal parsing errors, just continue
            if (!data.fatal) {
              console.log('Non-fatal parsing error - continuing playback');
              return;
            }
            
            // For fatal parsing errors, try to recover
            console.log('Fatal parsing error - attempting media recovery');
            try {
              // Try to recover multiple times before giving up
              let recoveryAttempts = 0;
              const maxRecoveryAttempts = 3;
              const recoveryInterval = setInterval(() => {
                try {
                  hlsInstance.recoverMediaError();
                  console.log(`Media recovery attempt ${recoveryAttempts + 1} successful`);
                  clearInterval(recoveryInterval);
                } catch (recoveryError) {
                  console.error(`Media recovery attempt ${recoveryAttempts + 1} failed:`, recoveryError);
                  recoveryAttempts++;
                  if (recoveryAttempts >= maxRecoveryAttempts) {
                    console.error('All media recovery attempts failed');
                    clearInterval(recoveryInterval);
                  }
                }
              }, 1000);
            } catch (recoveryError) {
              console.error('Media recovery failed:', recoveryError);
            }
            return;
          }
          
          // Handle network errors with retry logic
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.error('Network error - attempting reload');
            // Simple retry - just reload the source
            setTimeout(() => {
              hlsInstance.loadSource(streamUrl);
            }, 2000);
            return;
          }
          
          // Handle media errors with recovery logic
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.error('Media error - attempting recovery');
            try {
              // Try to recover multiple times before giving up
              let recoveryAttempts = 0;
              const maxRecoveryAttempts = 3;
              const recoveryInterval = setInterval(() => {
                try {
                  hlsInstance.recoverMediaError();
                  console.log(`Media recovery attempt ${recoveryAttempts + 1} successful`);
                  clearInterval(recoveryInterval);
                } catch (recoveryError) {
                  console.error(`Media recovery attempt ${recoveryAttempts + 1} failed:`, recoveryError);
                  recoveryAttempts++;
                  if (recoveryAttempts >= maxRecoveryAttempts) {
                    console.error('All media recovery attempts failed');
                    clearInterval(recoveryInterval);
                  }
                }
              }, 1000);
            } catch (recoveryError) {
              console.error('Media recovery failed:', recoveryError);
            }
            return;
          }
          
          // Handle manifest errors by reloading
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.details.includes('manifest')) {
            console.error('Manifest error - reloading source');
            setTimeout(() => {
              hlsInstance.loadSource(streamUrl);
            }, 3000);
            return;
          }
          
          // Only handle fatal errors that completely break playback
          if (data.fatal) {
            console.error('Fatal error - manual intervention required');
          }
          // Non-fatal errors - just log them, don't intervene
        });

        // REMOVED: Fragment parsing error handling - let HLS.js handle it
        // REMOVED: Buffer appending error handling - let HLS.js handle it
        // REMOVED: Buffer stall handling - let HLS.js handle it with patience

        // SIMPLE LOGGING - no intervention
        hlsInstance.on(Hls.Events.FRAG_LOADING, (event, data) => {
          console.log('Loading fragment:', data.frag.sn);
        });

        hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
          console.log('Fragment loaded:', data.frag.sn);
        });

        // Just log errors - don't intervene
        hlsInstance.on(Hls.Events.FRAG_LOAD_ERROR, (event, data) => {
          console.warn('Fragment load error:', data.frag?.sn, data.reason);
          // Let HLS.js handle retries based on our patient configuration
        });

        hlsInstance.on(Hls.Events.FRAG_LOAD_TIMEOUT, (event, data) => {
          console.warn('Fragment timeout:', data.frag?.sn);
          // Let HLS.js handle retries based on our patient configuration
        });

        setHls(hlsInstance);

      } catch (error) {
        console.error('Failed to initialize HLS player:', error);
      }
    };

    // ALL AGGRESSIVE ERROR RECOVERY FUNCTIONS REMOVED
    // The player now relies entirely on HLS.js's patient built-in retry mechanisms

    if (streamUrl && streamType === 'hls' && videoRef.current) {
      initializeHls();
    } else if (streamUrl && videoRef.current) {
      // For non-HLS streams, just set the src directly
      videoRef.current.src = streamUrl;
      // Clear qualities for non-HLS streams
      setQualities([]);
      setCurrentQuality('0');
    }

    return () => {
      if (hlsInstance && typeof hlsInstance.destroy === 'function') {
        hlsInstance.destroy();
      }
      if (gapJumpTimer) {
        clearTimeout(gapJumpTimer);
      }
    };
  }, [streamUrl, streamType]); // Removed videoRef from dependencies - it should never change

  useEffect(() => {
    console.log('🎬 useHls subtitle effect triggered:', {
      hasActiveSubtitle: !!activeSubtitle,
      activeSubtitleLanguage: activeSubtitle?.language,
      activeSubtitleBlobUrl: activeSubtitle?.blobUrl,
      hasVideoRef: !!videoRef.current
    });

    if (videoRef.current) {
        // Clear existing subtitle tracks and disable ALL native subtitle rendering
        const video = videoRef.current;
        const existingTracks = video.querySelectorAll('track');
        console.log('🧹 Removing existing tracks:', existingTracks.length);
        existingTracks.forEach(track => track.remove());
        
        // Disable all text tracks completely
        for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = 'disabled';
            console.log('🔇 Disabled text track:', i, video.textTracks[i].label);
        }

        // DO NOT add any native track elements - we only use custom overlay
        if (activeSubtitle?.blobUrl) {
            console.log('📝 Subtitle selected, using ONLY custom overlay:', activeSubtitle.language);
            console.log('🚫 Native subtitle tracks completely disabled to prevent duplication');
        } else {
            console.log('🔄 No active subtitle - all subtitle rendering disabled');
        }
    } else {
        console.warn('⚠️ No video ref available for subtitle management');
    }
  }, [activeSubtitle]); // Removed videoRef from dependencies - it should never change
  
  const setQuality = (qualityValue) => {
    if (!hls) {
      console.warn('HLS instance not available');
      return;
    }

    try {
      const levelIndex = parseInt(qualityValue);
      const selectedQuality = qualities.find(q => q.id === levelIndex);
      
      if (isNaN(levelIndex) || !selectedQuality) {
        console.error('Invalid quality level:', qualityValue);
        return;
      }
      
      // FORCE DISABLE AUTO LEVEL AND LOCK TO SELECTED QUALITY
      hls.autoLevelEnabled = false;
      hls.autoLevelCapping = levelIndex;
      hls.currentLevel = levelIndex;
      hls.nextLevel = levelIndex;
      hls.loadLevel = levelIndex;
      hls.startLevel = levelIndex; // Also set start level
      hls.capLevelToPlayerSize = false; // Ensure player size capping is disabled
      
      setCurrentQuality(levelIndex.toString());
      
      console.log(`Quality LOCKED to: ${selectedQuality.label} (${Math.round(selectedQuality.bitrate / 1000)}k)`);
      console.log('Auto quality switching is COMPLETELY DISABLED');
    } catch (error) {
      console.error('Error setting quality:', error);
    }
  };

  return { 
    qualities, 
    setQuality, 
    currentQuality, 
    hlsInstance: hls,
    // Enhanced error recovery and buffer health information
    errorRecoveryState,
    bufferHealth,
    segmentErrors
  };
}; 