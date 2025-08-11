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

        // Simple HLS configuration
        const hlsConfig = {
          capLevelToPlayerSize: false,
          startLevel: -1,
          
          // Disable native subtitle rendering
          renderTextTracksNatively: false,
          subtitleTrackController: false,
          subtitleDisplay: false,
          enableWebVTT: false,
          
          // Basic buffering settings
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.3,
          backBufferLength: 30,
          
          // Error recovery settings
          maxLoadingDelay: 1,
          maxRetryDelay: 2,
          retryDelay: 0.2,
          
          // Fragment retry settings
          fragLoadingRetryDelay: 500,
          fragLoadingMaxRetry: 1,
          fragLoadingMaxRetryTimeout: 2000,
          
          // Manifest and level loading
          manifestLoadingRetryDelay: 500,
          manifestLoadingMaxRetry: 2,
          manifestLoadingMaxRetryTimeout: 3000,
          levelLoadingRetryDelay: 500,
          levelLoadingMaxRetry: 2,
          levelLoadingMaxRetryTimeout: 3000,
          
          // Gap jumping
          nudgeOffset: 0.1,
          nudgeMaxRetry: 5,
          maxSeekHole: 1,
          
          // Quality adaptation
          abrEwmaFastLive: 8.0,
          abrEwmaSlowLive: 15.0,
          abrEwmaFastVoD: 6.0,
          abrEwmaSlowVoD: 20.0,
          abrEwmaDefaultEstimate: 750000,
          abrBandWidthFactor: 0.7,
          abrBandWidthUpFactor: 0.8,
          abrMaxWithRealBitrate: true,
          
          // Additional settings
          enableWorker: false,
          lowLatencyMode: false,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableSoftwareAES: true,
          cueEndOnNext: true,
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
          
          const sortedLevels = [...data.levels].sort((a, b) => {
            if (b.height !== a.height) {
              return b.height - a.height;
            }
            return b.bitrate - a.bitrate;
          });
          
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
          
          const highestQualityLevel = levels[0];
          if (highestQualityLevel) {
            hlsInstance.currentLevel = highestQualityLevel.id;
            setCurrentQuality(highestQualityLevel.id.toString());
            console.log('🎬 Initial quality set to highest available:', 
              `${highestQualityLevel.height}p @ ${highestQualityLevel.bitrate}bps (HLS level ${highestQualityLevel.id})`);
          } else {
            hlsInstance.currentLevel = 0;
            setCurrentQuality('0');
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

    // Fatal error recovery
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
            handleMediaRecovery(hlsInstance, data);
          }
          break;
          
        case 'mediaError':
          handleMediaRecovery(hlsInstance, data);
          break;
          
        default:
          console.log('🔄 Unknown fatal error type - attempting full recovery');
          handleFullRestart(hlsInstance);
          break;
      }
    };

    // Media error recovery
    const handleMediaRecovery = (hlsInstance, data) => {
      console.log('🔄 Media error recovery:', data.details);
      
      try {
        switch(data.details) {
          case 'bufferAppendError':
          case 'bufferAppendingError':
            console.log('📦 Buffer error - attempting buffer recovery');
            hlsInstance.recoverMediaError();
            break;
            
          case 'fragParsingError':
            console.log('📦 Fragment parsing error - recovering');
            hlsInstance.recoverMediaError();
            break;
            
          default:
            console.log('🔄 Generic media error recovery');
            hlsInstance.recoverMediaError();
            break;
        }
      } catch (error) {
        console.error('❌ Media recovery failed:', error);
        handleFullRestart(hlsInstance);
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
  }, [streamUrl, streamType, activeSubtitle]);

  // Quality switching function
  const setQuality = (qualityId) => {
    if (hls && qualities.length > 0) {
      const previousQuality = hls.currentLevel;
      const targetQuality = parseInt(qualityId);
      
      hls.currentLevel = targetQuality;
      setCurrentQuality(qualityId);
      
      console.log('🎬 Manual quality switch:', {
        from: previousQuality,
        to: targetQuality,
        label: qualities.find(q => q.id === targetQuality)?.label || 'unknown'
      });
    }
  };

  return { qualities, setQuality, currentQuality };
};