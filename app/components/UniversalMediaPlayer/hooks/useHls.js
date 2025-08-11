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

        // Enhanced HLS configuration for optimal streaming performance
        const hlsConfig = {
          capLevelToPlayerSize: false, // Disable automatic quality switching
          startLevel: -1, // Will be overridden after manifest parsing to highest quality
          
          // COMPLETELY DISABLE ALL NATIVE SUBTITLE RENDERING to prevent conflicts with custom overlay
          renderTextTracksNatively: false, // Disable native text track rendering
          subtitleTrackController: false,  // Disable subtitle track controller
          subtitleDisplay: false,          // Disable subtitle display
          enableWebVTT: false,             // Disable WebVTT to prevent conflicts
          
          // Enhanced buffering configuration (60MB buffer, 60 seconds max buffer length)
          maxBufferLength: 60,             // 60 seconds max buffer length
          maxMaxBufferLength: 120,         // Maximum buffer length
          maxBufferSize: 60 * 1000 * 1000, // 60MB buffer
          maxBufferHole: 0.3,              // Reduced max buffer hole for faster gap jumping
          backBufferLength: 30,            // Keep 30 seconds of back buffer
          
          // Aggressive error recovery settings (fragLoadingMaxRetry: 1, fragLoadingRetryDelay: 500ms)
          maxLoadingDelay: 1,              // Reduced to 1 second max delay before giving up
          maxRetryDelay: 2,                // Reduced to 2 seconds max retry delay
          retryDelay: 0.2,                 // Reduced to 200ms initial retry delay
          
          // Fragment retry settings - immediate skip for problematic segments
          fragLoadingRetryDelay: 500,      // 500ms delay between retries (as specified)
          fragLoadingMaxRetry: 1,          // Only 1 retry before immediate skip (as specified)
          fragLoadingMaxRetryTimeout: 2000, // 2 second timeout for aggressive skipping
          
          // Manifest retry settings  
          manifestLoadingRetryDelay: 500,  
          manifestLoadingMaxRetry: 2,      
          manifestLoadingMaxRetryTimeout: 3000, // Reduced timeout
          
          // Level loading retry settings
          levelLoadingRetryDelay: 500,     
          levelLoadingMaxRetry: 2,         
          levelLoadingMaxRetryTimeout: 3000, // Reduced timeout
          
          // Enhanced gap jumping functionality for buffer stall situations
          nudgeOffset: 0.1,                // Small nudge to skip gaps
          nudgeMaxRetry: 5,                // Increased max gap skip attempts
          maxSeekHole: 1,                  // Reduced max seek hole size for faster jumping
          
          // Quality stability settings with conservative bandwidth factors (0.7-0.8)
          abrEwmaFastLive: 8.0,            // Much slower adaptation to prevent oscillation
          abrEwmaSlowLive: 15.0,           // Very slow for quality maintenance
          abrEwmaFastVoD: 6.0,             // Slower adaptation for VoD
          abrEwmaSlowVoD: 20.0,            // Much slower for VoD quality maintenance
          abrEwmaDefaultEstimate: 750000,  // More conservative default estimate
          abrBandWidthFactor: 0.7,         // Conservative bandwidth factors (0.7 as specified)
          abrBandWidthUpFactor: 0.8,       // Conservative upward switches (0.8 as specified)
          abrMaxWithRealBitrate: true,     // Use real bitrate for better quality decisions
          
          // Enhanced segment skipping and recovery
          enableWorker: false,             // Disable worker to avoid edge case issues
          lowLatencyMode: false,           // Disable low latency for better stability
          liveSyncDurationCount: 3,        // Sync duration for live streams
          liveMaxLatencyDurationCount: 10, // Max latency for live streams
          
          // Progressive error recovery configuration
          enableSoftwareAES: true,         // Enable software AES for better compatibility
          cueEndOnNext: true,              // Better cue handling
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
          hlsLogger.logHlsEvent('MANIFEST_PARSED', { levelCount: data.levels.length });
          
          // Sort levels by height (resolution) in descending order to get highest quality first
          const sortedLevels = [...data.levels].sort((a, b) => {
            // Primary sort by height (resolution)
            if (b.height !== a.height) {
              return b.height - a.height;
            }
            // Secondary sort by bitrate if height is the same
            return b.bitrate - a.bitrate;
          });
          
          // Create quality options with original HLS level indices
          const levels = sortedLevels.map((level, sortedIndex) => {
            // Find the original index in the unsorted data.levels array
            const originalIndex = data.levels.findIndex(l => 
              l.height === level.height && 
              l.bitrate === level.bitrate && 
              l.bandwidth === level.bandwidth
            );
            
            return {
              id: originalIndex, // Use original HLS index for level switching
              height: level.height,
              bitrate: level.bitrate,
              label: `${level.height}p`,
              bandwidth: level.bandwidth,
              sortedIndex: sortedIndex // Track sorted position for UI
            };
          });
          
          setQualities(levels);
          
          // Set to highest quality (first in sorted array)
          const highestQualityLevel = levels[0];
          if (highestQualityLevel) {
            hlsInstance.currentLevel = highestQualityLevel.id; // Use original HLS index
            setCurrentQuality(highestQualityLevel.id.toString());
            hlsLogger.logManifestParsed(levels, highestQualityLevel);
          } else {
            // Fallback to level 0 if no qualities found
            hlsInstance.currentLevel = 0;
            setCurrentQuality('0');
            hlsLogger.logManifestParsed(levels, { id: 0, height: 'auto', bitrate: 'auto' });
          }
        });
        
        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const newLevel = hlsInstance.levels[data.level];
          const previousLevel = hlsInstance.levels[parseInt(currentQuality)] || null;
          
          hlsLogger.logQualitySwitch(previousLevel, newLevel, 'automatic', true);
          setCurrentQuality(data.level.toString());
        });

        // Enhanced progressive error recovery system
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          const currentTime = Date.now();
          
          // Log HLS error with enhanced context
          hlsLogger.logHlsError(data.type, data.details, data.fatal, {
            url: data.url,
            response: data.response,
            frag: data.frag,
            reason: data.reason
          });

          // Update error recovery state
          setErrorRecoveryState(prev => {
            const timeSinceLastError = currentTime - prev.lastErrorTime;
            const isConsecutive = timeSinceLastError < 5000; // Within 5 seconds
            
            return {
              ...prev,
              lastErrorTime: currentTime,
              consecutiveErrors: isConsecutive ? prev.consecutiveErrors + 1 : 1
            };
          });

          if (data.fatal) {
            hlsLogger.error('HLS Fatal Error - Initiating Progressive Recovery', null, data);
            handleProgressiveFatalError(hlsInstance, data);
          } else {
            hlsLogger.warn('HLS Non-Fatal Error - Applying Immediate Recovery', data);
            handleEnhancedNonFatalError(hlsInstance, data);
          }
        });

        // Enhanced fragment parsing error handling
        hlsInstance.on(Hls.Events.FRAG_PARSING_ERROR, (event, data) => {
          console.warn('📦 Fragment parsing error - corrupted segment detected:', {
            details: data.details,
            reason: data.reason,
            url: data.frag?.url,
            sn: data.frag?.sn,
            level: data.frag?.level
          });
          
          // Immediately skip corrupted segments
          if (data.frag) {
            console.log('🦘 Skipping corrupted segment due to parsing error');
            handleSegmentSkip(data.frag);
          }
        });

        // Enhanced buffer error handling
        hlsInstance.on(Hls.Events.BUFFER_APPENDING_ERROR, (event, data) => {
          console.warn('🔧 Buffer appending error detected:', {
            details: data.details,
            sourceBufferName: data.sourceBufferName,
            error: data.error?.message
          });
          
          // Try to recover buffer state
          if (data.sourceBufferName === 'audio') {
            console.log('🔊 Audio buffer error - attempting audio recovery');
            try {
              hlsInstance.recoverMediaError();
            } catch (error) {
              console.error('❌ Audio recovery failed:', error);
            }
          }
        });

        // Enhanced buffer stall handling with improved gap jumping functionality
        hlsInstance.on(Hls.Events.BUFFER_STALLED_ERROR, (event, data) => {
          const currentTime = Date.now();
          
          setBufferHealth(prev => ({
            ...prev,
            stalls: prev.stalls + 1,
            lastStallTime: currentTime
          }));
          
          console.warn('⏸️ Buffer stalled - Initiating enhanced gap jumping recovery...', {
            stallCount: bufferHealth.stalls + 1,
            timeSinceLastStall: currentTime - bufferHealth.lastStallTime
          });
          
          // Clear any existing stall timer
          if (gapJumpTimer) {
            clearTimeout(gapJumpTimer);
          }
          
          // Immediate enhanced gap jump attempt
          handleEnhancedGapJump();
          
          // Progressive recovery with multiple attempts
          let recoveryAttempt = 0;
          const progressiveRecovery = () => {
            recoveryAttempt++;
            
            if (recoveryAttempt <= 3 && videoRef.current) {
              console.log(`⚡ Progressive stall recovery attempt ${recoveryAttempt}/3`);
              
              const video = videoRef.current;
              const currentTime = video.currentTime;
              
              switch (recoveryAttempt) {
                case 1:
                  // Small forward jump
                  video.currentTime = currentTime + 0.5;
                  break;
                case 2:
                  // Medium forward jump
                  video.currentTime = currentTime + 2;
                  break;
                case 3:
                  // Larger jump and quality downgrade if needed
                  video.currentTime = currentTime + 5;
                  handleQualityDowngrade(hlsInstance);
                  break;
              }
              
              // Schedule next recovery attempt if needed
              gapJumpTimer = setTimeout(progressiveRecovery, 1500);
            }
          };
          
          // Start progressive recovery after initial gap jump
          gapJumpTimer = setTimeout(progressiveRecovery, 1000);
        });

        // Enhanced segment loading tracking with performance monitoring
        hlsInstance.on(Hls.Events.FRAG_LOADING, (event, data) => {
          // Track segment loading start time for performance monitoring
          const segmentKey = `${data.frag.level}-${data.frag.sn}`;
          data.frag.loadStartTime = Date.now();
          
          hlsLogger.logFragmentLoading(data.frag);
        });

        hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
          const loadEndTime = Date.now();
          const loadTime = data.frag.loadStartTime ? loadEndTime - data.frag.loadStartTime : 0;
          
          // Successfully loaded segment - clear any error tracking and update performance metrics
          const segmentKey = `${data.frag.level}-${data.frag.sn}`;
          
          setSegmentErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(segmentKey);
            return newMap;
          });
          
          // Update buffer health with segment load time
          setBufferHealth(prev => {
            const newLoadTimes = [...prev.segmentLoadTimes, loadTime].slice(-10); // Keep last 10 load times
            const averageLoadTime = newLoadTimes.reduce((a, b) => a + b, 0) / newLoadTimes.length;
            
            return {
              ...prev,
              segmentLoadTimes: newLoadTimes,
              averageSegmentLoadTime: averageLoadTime
            };
          });
          
          hlsLogger.logFragmentLoaded(data.frag, loadTime);
        });

        // Enhanced segment load error tracking with immediate skip for problematic segments
        hlsInstance.on(Hls.Events.FRAG_LOAD_ERROR, (event, data) => {
          const segmentKey = `${data.frag.level}-${data.frag.sn}`;
          const currentTime = Date.now();
          
          setSegmentErrors(prev => {
            const newMap = new Map(prev);
            const errorInfo = newMap.get(segmentKey) || { count: 0, firstError: currentTime };
            const updatedErrorInfo = {
              count: errorInfo.count + 1,
              firstError: errorInfo.firstError,
              lastError: currentTime
            };
            newMap.set(segmentKey, updatedErrorInfo);
            
            console.warn('📦 Fragment load error - Immediate skip triggered:', {
              url: data.frag?.url,
              level: data.frag?.level,
              sn: data.frag?.sn,
              errorCount: updatedErrorInfo.count,
              reason: data.reason,
              response: data.response,
              httpCode: data.response?.code
            });
            
            // Immediate skip for any segment error (aggressive segment skipping within 2 seconds)
            console.log('🦘 Problematic segment detected - Executing immediate skip...');
            handleAggressiveSegmentSkip(data.frag, updatedErrorInfo.count);
            
            // If segment has failed multiple times, mark it as permanently problematic
            if (updatedErrorInfo.count >= 3) {
              console.error('💀 Segment permanently marked as problematic:', segmentKey);
            }
            
            return newMap;
          });
        });

        // Handle network timeouts more aggressively
        hlsInstance.on(Hls.Events.FRAG_LOAD_TIMEOUT, (event, data) => {
          console.warn('⏱️ Fragment load timeout:', {
            url: data.frag?.url,
            sn: data.frag?.sn,
            level: data.frag?.level
          });
          
          // Skip timed out segments immediately
          if (data.frag) {
            console.log('🦘 Skipping timed out segment');
            handleSegmentSkip(data.frag);
          }
        });

        setHls(hlsInstance);

      } catch (error) {
        console.error('Failed to initialize HLS player:', error);
      }
    };

    // Enhanced gap jumping functionality for buffer stall situations
    const handleEnhancedGapJump = () => {
      if (!videoRef.current || !hlsInstance) return;
      
      const video = videoRef.current;
      const currentTime = video.currentTime;
      const buffered = video.buffered;
      
      console.log('🦘 Enhanced gap jump analysis:', {
        currentTime: currentTime.toFixed(2),
        bufferedRanges: Array.from({ length: buffered.length }, (_, i) => ({
          start: buffered.start(i).toFixed(2),
          end: buffered.end(i).toFixed(2)
        }))
      });
      
      // Update gap jump counter
      setBufferHealth(prev => ({
        ...prev,
        gapJumps: prev.gapJumps + 1
      }));
      
      // Strategy 1: Find the next buffered range ahead
      let bestJumpTarget = null;
      let smallestGap = Infinity;
      
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i);
        const end = buffered.end(i);
        
        // Look for buffered ranges ahead of current position
        if (start > currentTime + 0.1) {
          const gapSize = start - currentTime;
          if (gapSize < smallestGap) {
            smallestGap = gapSize;
            bestJumpTarget = start + 0.1; // Jump slightly into the buffered range
          }
        }
      }
      
      if (bestJumpTarget) {
        console.log(`🦘 Smart gap jump: ${currentTime.toFixed(2)}s → ${bestJumpTarget.toFixed(2)}s (gap: ${smallestGap.toFixed(2)}s)`);
        video.currentTime = bestJumpTarget;
        return;
      }
      
      // Strategy 2: Progressive forward seeking based on buffer health
      const jumpDistance = bufferHealth.gapJumps < 3 ? 1 : bufferHealth.gapJumps < 6 ? 3 : 5;
      const jumpTo = currentTime + jumpDistance;
      
      console.log(`🦘 Progressive gap jump: ${currentTime.toFixed(2)}s → ${jumpTo.toFixed(2)}s (attempt: ${bufferHealth.gapJumps})`);
      video.currentTime = jumpTo;
    };

    // Aggressive segment skipping mechanism that skips corrupted segments within 2 seconds
    const handleAggressiveSegmentSkip = (frag, errorCount) => {
      if (!videoRef.current) return;
      
      const video = videoRef.current;
      const currentTime = video.currentTime;
      
      // Calculate skip distance based on error count and segment info
      let skipDistance;
      if (frag.duration && frag.duration > 0) {
        // Use actual segment duration
        skipDistance = frag.duration;
      } else {
        // Default skip distances based on error frequency
        skipDistance = errorCount === 1 ? 2 : errorCount === 2 ? 4 : 6;
      }
      
      const skipTo = currentTime + skipDistance;
      
      console.log(`🦘 Aggressive segment skip executed:`, {
        from: currentTime.toFixed(2),
        to: skipTo.toFixed(2),
        distance: skipDistance.toFixed(2),
        errorCount,
        segmentInfo: {
          level: frag.level,
          sn: frag.sn,
          duration: frag.duration,
          url: frag.url?.split('/').pop()
        }
      });
      
      // Execute the skip
      video.currentTime = skipTo;
      
      // If this segment has failed multiple times, consider quality downgrade
      if (errorCount >= 2) {
        console.warn('🔻 Multiple segment failures detected - considering quality downgrade');
        setTimeout(() => handleQualityDowngrade(hlsInstance), 1000);
      }
    };

    // Quality maintenance system to prevent unnecessary quality oscillation
    const handleQualityDowngrade = (hlsInstance) => {
      if (!hlsInstance || !hlsInstance.levels || hlsInstance.levels.length <= 1) {
        console.log('🔻 Quality downgrade skipped - no lower qualities available');
        return;
      }
      
      const currentTime = Date.now();
      const timeSinceLastChange = currentTime - errorRecoveryState.lastQualityChange;
      
      // Prevent rapid quality changes (quality maintenance)
      if (timeSinceLastChange < 10000) { // 10 second cooldown
        console.log('🔻 Quality downgrade blocked - too soon since last change');
        return;
      }
      
      const currentLevel = hlsInstance.currentLevel;
      const availableLevels = hlsInstance.levels.length;
      
      // Find next lower quality level
      let targetLevel = -1;
      for (let i = availableLevels - 1; i >= 0; i--) {
        if (i < currentLevel || currentLevel === -1) {
          targetLevel = i;
          break;
        }
      }
      
      if (targetLevel >= 0) {
        console.log(`🔻 Quality downgrade: Level ${currentLevel} → ${targetLevel}`, {
          from: hlsInstance.levels[currentLevel]?.height || 'auto',
          to: hlsInstance.levels[targetLevel]?.height || 'unknown'
        });
        
        hlsInstance.currentLevel = targetLevel;
        
        setErrorRecoveryState(prev => ({
          ...prev,
          qualityDowngrades: prev.qualityDowngrades + 1,
          lastQualityChange: currentTime
        }));
      } else {
        console.log('🔻 Quality downgrade failed - already at lowest quality');
      }
    };

    // Progressive error recovery with network error → media error → full restart fallback chain
    const handleProgressiveFatalError = (hlsInstance, data) => {
      console.log('🚨 PROGRESSIVE FATAL ERROR RECOVERY INITIATED:', {
        type: data.type,
        details: data.details,
        recoveryState: errorRecoveryState
      });
      
      const currentTime = Date.now();
      
      switch(data.type) {
        case 'networkError':
          setErrorRecoveryState(prev => ({ ...prev, networkRetries: prev.networkRetries + 1 }));
          
          if (errorRecoveryState.networkRetries < 3) {
            console.log(`🔄 Network error recovery attempt ${errorRecoveryState.networkRetries + 1}/3`);
            try {
              hlsInstance.startLoad();
              
              // If network errors persist, try quality downgrade
              if (errorRecoveryState.networkRetries >= 1) {
                setTimeout(() => handleQualityDowngrade(hlsInstance), 2000);
              }
            } catch (error) {
              console.error('❌ Network recovery failed:', error);
              // Escalate to media error recovery
              handleProgressiveMediaRecovery(hlsInstance, data);
            }
          } else {
            console.log('🔄 Network retries exhausted - escalating to media recovery');
            handleProgressiveMediaRecovery(hlsInstance, data);
          }
          break;
          
        case 'mediaError':
          handleProgressiveMediaRecovery(hlsInstance, data);
          break;
          
        default:
          console.log('🔄 Unknown fatal error type - attempting full recovery');
          handleProgressiveFullRestart(hlsInstance);
          break;
      }
    };

    // Progressive media error recovery
    const handleProgressiveMediaRecovery = (hlsInstance, data) => {
      setErrorRecoveryState(prev => ({ ...prev, mediaRetries: prev.mediaRetries + 1 }));
      
      if (errorRecoveryState.mediaRetries < 2) {
        console.log(`🔄 Media error recovery attempt ${errorRecoveryState.mediaRetries + 1}/2:`, data.details);
        
        try {
          switch(data.details) {
            case 'bufferAppendError':
            case 'bufferAppendingError':
              console.log('📦 Buffer error - attempting buffer recovery with quality downgrade');
              hlsInstance.recoverMediaError();
              setTimeout(() => handleQualityDowngrade(hlsInstance), 1000);
              break;
              
            case 'fragParsingError':
              console.log('📦 Fragment parsing error - skipping and recovering');
              if (data.frag) {
                handleAggressiveSegmentSkip(data.frag, 1);
              }
              hlsInstance.recoverMediaError();
              break;
              
            default:
              console.log('🔄 Generic media error recovery');
              hlsInstance.recoverMediaError();
              break;
          }
        } catch (error) {
          console.error('❌ Media recovery failed:', error);
          handleProgressiveFullRestart(hlsInstance);
        }
      } else {
        console.log('🔄 Media retries exhausted - escalating to full restart');
        handleProgressiveFullRestart(hlsInstance);
      }
    };

    // Progressive full restart with position preservation
    const handleProgressiveFullRestart = (hlsInstance) => {
      setErrorRecoveryState(prev => ({ ...prev, fullRestarts: prev.fullRestarts + 1 }));
      
      if (errorRecoveryState.fullRestarts < 3) {
        console.log(`🔄 Full restart attempt ${errorRecoveryState.fullRestarts + 1}/3`);
        
        if (hlsInstance && hlsInstance.media) {
          try {
            const currentTime = videoRef.current?.currentTime || 0;
            console.log('💾 Preserving playback position for restart:', currentTime);
            
            hlsInstance.detachMedia();
            
            // Progressive restart delay based on attempt count
            const restartDelay = 1500 * errorRecoveryState.fullRestarts;
            
            setTimeout(() => {
              if (videoRef.current && hlsInstance) {
                console.log('🔌 Reattaching media after progressive restart');
                hlsInstance.attachMedia(videoRef.current);
                hlsInstance.startLoad();
                
                // Restore position with longer delay for stability
                setTimeout(() => {
                  if (videoRef.current && currentTime > 0) {
                    videoRef.current.currentTime = currentTime;
                    console.log('⏰ Position restored after restart:', currentTime);
                  }
                }, 2000);
              }
            }, restartDelay);
          } catch (error) {
            console.error('❌ Progressive full restart failed:', error);
          }
        }
      } else {
        console.error('💀 All recovery attempts exhausted - player may be in unrecoverable state');
        // Could emit an event here for the UI to show a manual retry button
      }
    };

    // Helper function to handle fatal errors with progressive recovery (legacy compatibility)
    const handleFatalError = (hlsInstance, data) => {
      // Delegate to the new progressive recovery system
      handleProgressiveFatalError(hlsInstance, data);
    };



    // Enhanced non-fatal error handler with immediate recovery
    const handleEnhancedNonFatalError = (hlsInstance, data) => {
      console.log('⚠️ ENHANCED NON-FATAL ERROR HANDLING:', data.details);
      
      switch(data.details) {
        case 'fragLoadError':
          console.log('📦 Fragment load error - immediate aggressive handling');
          if (data.frag) {
            // Immediate skip - already handled by FRAG_LOAD_ERROR event
            console.log('🦘 Fragment load error will be handled by segment tracking');
          }
          break;
          
        case 'fragParsingError':
          console.log('📦 Fragment parsing error - corrupted segment detected');
          if (data.frag) {
            console.log('🦘 Immediately skipping corrupted segment');
            handleAggressiveSegmentSkip(data.frag, 1);
          }
          break;
          
        case 'fragLoadTimeOut':
          console.log('⏱️ Fragment load timeout - network issue detected');
          if (data.frag) {
            console.log('🦘 Skipping timed out segment with aggressive recovery');
            handleAggressiveSegmentSkip(data.frag, 1);
          }
          break;
          
        case 'levelLoadError':
          console.log('📋 Level load error - implementing quality maintenance');
          // Use quality maintenance system instead of random switching
          setTimeout(() => handleQualityDowngrade(hlsInstance), 500);
          break;
          
        case 'bufferStalledError':
          console.log('⏸️ Buffer stalled error - enhanced gap jumping active');
          // Enhanced gap jumping is handled by the BUFFER_STALLED_ERROR event
          break;
          
        case 'bufferSeekOverHole':
        case 'bufferNudgeOnStall':
          console.log('🕳️ Buffer hole detected - enhanced auto-recovery');
          // Enhanced recovery with gap jumping
          setTimeout(() => {
            if (videoRef.current) {
              const video = videoRef.current;
              if (video.paused && video.readyState >= 2) {
                console.log('🔄 Enhanced recovery: forcing play after buffer hole');
                video.play().catch(console.error);
              } else if (!video.paused && video.currentTime === video.currentTime) {
                // Video is playing but might be stuck
                console.log('🦘 Enhanced recovery: small gap jump for stuck playback');
                handleEnhancedGapJump();
              }
            }
          }, 1500);
          break;
          
        case 'bufferAppendingError':
          console.log('🔧 Buffer appending error - enhanced buffer management');
          // Try to recover with quality downgrade if persistent
          setTimeout(() => {
            if (errorRecoveryState.consecutiveErrors >= 3) {
              console.log('🔻 Multiple buffer errors - attempting quality downgrade');
              handleQualityDowngrade(hlsInstance);
            }
          }, 1000);
          break;
          
        case 'keyLoadError':
          console.log('🔐 Key load error - DRM/encryption issue');
          // For encrypted content, try to reload the key
          if (data.frag) {
            handleAggressiveSegmentSkip(data.frag, 1);
          }
          break;
          
        default:
          console.log('🔄 Other non-fatal error - enhanced monitoring for escalation');
          // Enhanced monitoring - if too many consecutive errors, escalate
          if (errorRecoveryState.consecutiveErrors >= 5) {
            console.warn('⚠️ Too many consecutive non-fatal errors - considering escalation');
            setTimeout(() => handleQualityDowngrade(hlsInstance), 2000);
          }
          break;
      }
    };

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
  }, [streamUrl, videoRef, streamType]);

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
  }, [activeSubtitle, videoRef]);
  
  const setQuality = (qualityValue) => {
    if (!hls) {
      console.warn('🎬 HLS instance not available for quality change');
      return;
    }

    console.log('🎬 Setting quality to:', qualityValue, 'Type:', typeof qualityValue);

    try {
      // Parse the quality level index (this is the original HLS level index, not sorted position)
      const levelIndex = parseInt(qualityValue);
      
      // Validate the level index against available qualities
      const selectedQuality = qualities.find(q => q.id === levelIndex);
      if (isNaN(levelIndex) || !selectedQuality) {
        console.error('🎬 Invalid quality level:', qualityValue, 'Available levels:', qualities.map(q => q.id));
        return;
      }
      
      // Set the specific quality level using original HLS index
      hls.currentLevel = levelIndex;
      setCurrentQuality(levelIndex.toString());
      
      const isHighestQuality = selectedQuality.sortedIndex === 0;
      console.log('🎬 Quality set to level:', levelIndex, 
        `Resolution: ${selectedQuality.height}p @ ${Math.round(selectedQuality.bitrate / 1000)}k`,
        isHighestQuality ? '(HIGHEST QUALITY)' : '');
    } catch (error) {
      console.error('🎬 Error setting quality:', error);
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