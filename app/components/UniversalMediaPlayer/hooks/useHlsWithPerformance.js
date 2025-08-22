/**
 * Simple HLS Hook without performance monitoring bloat
 */

import { useState, useEffect } from 'react';

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

export const useHlsWithPerformance = (streamUrl, videoRef, streamType, activeSubtitle) => {
  const [hls, setHls] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('0');

  useEffect(() => {
    // Early return if no stream URL or not HLS
    if (!streamUrl || streamType !== 'hls') {
      console.log('🚫 HLS: No stream URL or not HLS type, skipping initialization');
      return;
    }

    console.log('🎬 HLS: Initializing with', { streamUrl, streamType });
    
    let hlsInstance = null;

    
        const initializeHls = async () => {
          try {
            const Hls = await loadHlsJs();
            if (!Hls || !Hls.isSupported() || !videoRef.current) {
              console.warn('HLS.js is not supported or video element is not available.');
              return;
            }
    
            const isDirectAccess = streamUrl && !streamUrl.startsWith('/api/');
    
            // Enhanced HLS configuration for stability
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
              
              // BALANCED BUFFERING - stable performance without excessive memory usage
              maxBufferLength: 60,             // 1 minute forward buffer (reasonable)
              maxMaxBufferLength: 180,         // 3 minutes maximum buffer (reduced)
              maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size (reasonable)
              maxBufferHole: 1.0,              // Allow 1 second holes before jumping
              backBufferLength: 30,            // Keep 30 seconds of back buffer (reduced)
              
              // AGGRESSIVE PRELOADING SETTINGS
              highBufferWatchdogPeriod: 1,     // Check buffer health every 1 second
              lowBufferWatchdogPeriod: 0.5,    // Check low buffer every 0.5 seconds
              maxLoadingDelay: 2,              // Wait 2 seconds before declaring error (reduced for faster loading)
              maxRetryDelay: 4,                // Up to 4 seconds between retries (reduced)
              retryDelay: 0.5,                 // Start with 0.5 second retry delay (faster)
              
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
              
              // BALANCED GAP HANDLING - allow reasonable gap jumping
              nudgeOffset: 0.1,                // Small nudging allowed
              nudgeMaxRetry: 3,                // Limited nudge retries
              maxSeekHole: 2,                  // Allow 2 second gaps before jumping (reasonable)
              lowLatencyMode: false,           // Disable low latency mode which can cause instability
              
              // NORMAL LOADING WITH QUALITY CONTROL
              maxStarvationDelay: 4,           // Normal starvation recovery (4 seconds)
              testBandwidth: false,            // Don't test bandwidth
              
              // DISABLE ABR (Adaptive Bitrate) - manual quality only
              abrEwmaFastLive: 99999,          // Effectively disable ABR
              abrEwmaSlowLive: 99999,          // Effectively disable ABR
              abrEwmaFastVoD: 99999,           // Effectively disable ABR
              abrEwmaSlowVoD: 99999,           // Effectively disable ABR
              abrEwmaDefaultEstimate: 5000000, // High default to prevent downgrade
              abrBandWidthFactor: 0.0,         // Completely disable (0.0)
              abrBandWidthUpFactor: 0.0,       // Completely disable (0.0)
              abrMaxWithRealBitrate: false,    // Don't use real bitrate for ABR
              
              // KEEP QUALITY LOCKED BUT ALLOW NORMAL LOADING
              capLevelToPlayerSize: false,     // Don't cap level based on player size
              
              // STABLE SETTINGS
              enableWorker: true,              // Use worker for better performance
              lowLatencyMode: false,           // Disable low latency for stability
              progressive: true,               // Enable progressive streaming
              
              // AUTOPLAY SETTINGS
              autoStartLoad: true,             // Automatically start loading
              startPosition: -1,               // Start from beginning
            };
        // Source-specific header management
        const getSourceSpecificHeaders = (url) => {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.toLowerCase();
          
          const baseHeaders = {
            'User-Agent': navigator.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9'
          };
          
          if (hostname.includes('vidsrc') || hostname.includes('cloudnestra')) {
            console.log('🎬 HLS Headers: Using minimal headers for vidsrc/cloudnestra source');
            return {
              'User-Agent': baseHeaders['User-Agent'],
              'Accept': baseHeaders['Accept']
            };
          }
          
          if (hostname.includes('shadowlandschronicles')) {
            console.log('🎬 HLS Headers: Using shadowlandschronicles-specific headers');
            return {
              ...baseHeaders,
              'Referer': 'https://cloudnestra.com/',
              'Origin': 'https://cloudnestra.com'
            };
          }
          
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
          
          console.log('🎬 HLS Headers: Using default headers for unknown source:', hostname);
          return baseHeaders;
        };

        if (isDirectAccess) {
          hlsConfig.xhrSetup = function(xhr, url) {
            const headers = getSourceSpecificHeaders(url);
            Object.entries(headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value);
            });
            console.log('🎬 HLS config: Applied source-specific headers for:', new URL(url).hostname, headers);
          };
        }

        hlsInstance = new Hls(hlsConfig);
        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoRef.current);

        // Manifest parsing
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('🎬 HLS Manifest parsed, levels:', data.levels);
          
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
          
          // DEFAULT TO HIGHEST QUALITY
          const highestQualityLevel = levels[0];
          
          if (highestQualityLevel) {
            // LOCK THE QUALITY - no automatic changes
            hlsInstance.startLevel = highestQualityLevel.id;
            hlsInstance.currentLevel = highestQualityLevel.id;
            hlsInstance.nextLevel = highestQualityLevel.id;
            hlsInstance.loadLevel = highestQualityLevel.id;
            hlsInstance.autoLevelCapping = highestQualityLevel.id; // Lock auto level capping
            hlsInstance.capLevelToPlayerSize = false; // Ensure player size capping is disabled
            setCurrentQuality(highestQualityLevel.id.toString());
            console.log(`🎬 Quality locked to: ${highestQualityLevel.label} (${highestQualityLevel.bitrate} bps)`);
            console.log('🎬 Auto quality switching is COMPLETELY DISABLED');
          } else {
            // Fallback to first level if no highest quality found
            hlsInstance.autoLevelEnabled = false;
            hlsInstance.startLevel = 0;
            hlsInstance.currentLevel = 0;
            hlsInstance.nextLevel = 0;
            hlsInstance.loadLevel = 0;
            hlsInstance.autoLevelCapping = 0;
            hlsInstance.capLevelToPlayerSize = false;
            setCurrentQuality('0');
            console.log('🎬 Quality locked to default level 0');
            console.log('🎬 Auto quality switching is COMPLETELY DISABLED');
          }
        });
        
        // Level switching
        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          console.log('🎬 HLS Level switched to:', data.level);
          setCurrentQuality(data.level.toString());
        });

        // Error handling
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          console.log('🎬 HLS Error Event:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            url: data.url,
            response: data.response,
            frag: data.frag,
            reason: data.reason
          });

          if (data.fatal) {
            console.error('🎬 HLS Fatal Error:', data);
            handleFatalError(hlsInstance, data);
          } else {
            console.warn('🎬 HLS Non-Fatal Error:', data);
            handleNonFatalError(hlsInstance, data);
          }
        });

        // Fragment loading events
        hlsInstance.on(Hls.Events.FRAG_LOADING, (event, data) => {
          console.log('📦 Fragment loading started:', {
            level: data.frag.level,
            sn: data.frag.sn,
            duration: data.frag.duration
          });
        });

        hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
          console.log('✅ Fragment loaded successfully:', {
            level: data.frag.level,
            sn: data.frag.sn,
            size: data.frag.loaded || 'unknown'
          });
        });

        hlsInstance.on(Hls.Events.FRAG_LOAD_ERROR, (event, data) => {
          console.warn('📦 Fragment load error:', {
            url: data.frag?.url,
            level: data.frag?.level,
            sn: data.frag?.sn,
            reason: data.reason,
            response: data.response,
            httpCode: data.response?.code
          });
        });

        setHls(hlsInstance);

      } catch (error) {
        console.error('Failed to initialize HLS player:', error);
      }
    };

    // SIMPLIFIED Fatal error recovery - single attempt only
    const handleFatalError = (hlsInstance, data) => {
      console.log('🚨 FATAL ERROR RECOVERY:', {
        type: data.type,
        details: data.details
      });
      
      switch(data.type) {
        case 'networkError':
          console.log('🔄 Network error recovery');
          try {
            hlsInstance.startLoad();
          } catch (error) {
            console.error('❌ Network recovery failed:', error);
          }
          break;
          
        case 'mediaError':
          handleMediaRecovery(hlsInstance, data);
          break;
          
        default:
          console.log('🔄 Unknown fatal error - letting HLS.js handle it');
          break;
      }
    };

    // SIMPLIFIED Media error recovery - single attempt only
    const handleMediaRecovery = (hlsInstance, data) => {
      console.log('🔄 Media error recovery:', data.details);
      
      try {
        switch(data.details) {
          case 'bufferAppendError':
          case 'bufferAppendingError':
          case 'fragParsingError':
            console.log('📦 Media error - single recovery attempt');
            hlsInstance.recoverMediaError();
            break;
            
          default:
            console.log('🔄 Generic media error - single recovery attempt');
            hlsInstance.recoverMediaError();
            break;
        }
      } catch (error) {
        console.error('❌ Media recovery failed:', error);
      }
    };

    // Non-fatal error handling
    const handleNonFatalError = (hlsInstance, data) => {
      switch(data.details) {
        case 'fragLoadError':
        case 'fragLoadTimeOut':
          console.log('📦 Fragment error - will retry automatically');
          break;
          
        case 'levelLoadError':
        case 'levelLoadTimeOut':
          console.log('📋 Level load error - will retry automatically');
          break;
          
        case 'bufferSeekOverHole':
        case 'bufferStalledError':
          console.log('⏸️ Buffer issue detected - ignoring automatic seek behavior');
          // Explicitly prevent any automatic seeking by HLS.js
          // Just log the error but don't let HLS.js handle it automatically
          break;
          
        case 'fragParsingError':
          console.log('📦 Fragment parsing error - ignoring (non-fatal)');
          // Don't trigger any recovery for non-fatal fragment parsing errors
          break;
          
        default:
          console.log('⚠️ Non-fatal error:', data.details);
          break;
      }
    };

    // Full restart
    const handleFullRestart = (hlsInstance) => {
      console.log('🔄 Full restart attempt');
      
      if (hlsInstance && hlsInstance.media) {
        try {
          const currentTime = videoRef.current?.currentTime || 0;
          console.log('💾 Preserving playback position for restart:', currentTime);
          
          hlsInstance.detachMedia();
          
          setTimeout(() => {
            if (videoRef.current && hlsInstance) {
              console.log('🔌 Reattaching media after restart');
              hlsInstance.attachMedia(videoRef.current);
              hlsInstance.startLoad();
              
              setTimeout(() => {
                if (videoRef.current && currentTime > 0) {
                  videoRef.current.currentTime = currentTime;
                  console.log('⏰ Position restored after restart:', currentTime);
                }
              }, 2000);
            }
          }, 1500);
        } catch (error) {
          console.error('❌ Full restart failed:', error);
        }
      }
    };

    // Call the async initialization function
    initializeHls();
    
    // Return the cleanup function
    return () => {
      console.log('🧹 Starting HLS cleanup');
      
      // Enhanced HLS instance cleanup
      if (hlsInstance) {
        try {
          // Remove all HLS event listeners
          const hlsEvents = [
            'MANIFEST_PARSED', 'LEVEL_SWITCHED', 'ERROR', 'FRAG_PARSING_ERROR',
            'BUFFER_APPENDING_ERROR', 'BUFFER_STALLED_ERROR', 'FRAG_LOADING',
            'FRAG_LOADED', 'FRAG_LOAD_ERROR', 'FRAG_LOAD_TIMEOUT'
          ];
          
          hlsEvents.forEach(eventName => {
            try {
              if (window.Hls && window.Hls.Events && window.Hls.Events[eventName]) {
                hlsInstance.off(window.Hls.Events[eventName]);
              }
            } catch (error) {
              console.warn(`Failed to remove HLS event listener for ${eventName}:`, error);
            }
          });
          
          // Detach media before destroying
          if (hlsInstance.media) {
            hlsInstance.detachMedia();
          }
          
          // Destroy HLS instance
          if (typeof hlsInstance.destroy === 'function') {
            hlsInstance.destroy();
            console.log('✅ HLS instance destroyed');
          } else {
            console.warn('⚠️ HLS instance does not have destroy method');
          }
          
        } catch (error) {
          console.error('❌ Error during HLS cleanup:', error);
        }
      }
      
      console.log('🧹 HLS cleanup completed');
    };
  }, [streamUrl, streamType]); // Removed activeSubtitle dependency to prevent video reload

  // Quality switching function
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
      hls.autoLevelCpping = levelIndex;
      hls.currentLevel = levelIndex;
      hls.nextLevel = levelIndex;
      hls.loadLevel = levelIndex;
      hls.startLevel = levelIndex; // Also set start level
      hls.capLevelToPlayerSize = false; // Ensure player size capping is disabled
      
      setCurrentQuality(levelIndex.toString());
      
      console.log(`🎬 Quality LOCKED to: ${selectedQuality.label} (${Math.round(selectedQuality.bitrate / 1000)}k)`);
      console.log('🎬 Auto quality switching is COMPLETELY DISABLED');
    } catch (error) {
      console.error('Error setting quality:', error);
    }
  };

  return { qualities, setQuality, currentQuality };
};