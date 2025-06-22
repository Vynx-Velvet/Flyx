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

export const useHls = (streamUrl, videoRef, streamType, activeSubtitle) => {
  const [hls, setHls] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('0'); // Default to highest quality (index 0)
  const [segmentErrors, setSegmentErrors] = useState(new Map()); // Track segment errors
  
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

        const hlsConfig = {
          capLevelToPlayerSize: false, // Disable automatic quality switching
          startLevel: -1, // Will be overridden after manifest parsing to highest quality
          
          // COMPLETELY DISABLE ALL NATIVE SUBTITLE RENDERING
          renderTextTracksNatively: false, // Disable native text track rendering
          subtitleTrackController: false,  // Disable subtitle track controller
          subtitleDisplay: false,          // Disable subtitle display
          
          // Aggressive high quality settings
          maxBufferLength: 60,        // Increase buffer to maintain quality
          maxMaxBufferLength: 120,    // Maximum buffer length
          maxBufferSize: 60 * 1000 * 1000, // 60MB buffer
          maxBufferHole: 0.5,         // Max buffer hole before seeking
          
          // Enhanced error recovery settings
          maxLoadingDelay: 2, // Reduced from 4 - Max delay before giving up on a segment
          maxRetryDelay: 4,   // Reduced from 8 - Max retry delay
          retryDelay: 0.5,    // Reduced from 1 - Initial retry delay
          
          // Fragment retry settings - More aggressive
          fragLoadingRetryDelay: 500,   // Reduced from 1000 - 0.5 second delay between retries
          fragLoadingMaxRetry: 1,       // Reduced from 2 - Only 1 retry before skipping
          fragLoadingMaxRetryTimeout: 5000, // Reduced from 10000 - 5 second timeout
          
          // Manifest retry settings  
          manifestLoadingRetryDelay: 500,  // Reduced from 1000
          manifestLoadingMaxRetry: 2,      // Reduced from 3
          manifestLoadingMaxRetryTimeout: 5000, // Reduced from 10000
          
          // Level loading retry settings
          levelLoadingRetryDelay: 500,     // Reduced from 1000
          levelLoadingMaxRetry: 2,         // Reduced from 3
          levelLoadingMaxRetryTimeout: 5000, // Reduced from 10000
          
          // Enhanced gap handling
          nudgeOffset: 0.1,           // Small nudge to skip gaps
          nudgeMaxRetry: 3,           // Max gap skip attempts
          maxSeekHole: 2,             // Max seek hole size
          
          // Quality maintenance settings
          abrEwmaFastLive: 5.0,       // Slower adaptation for live streams
          abrEwmaSlowLive: 9.0,       // Even slower for quality maintenance
          abrEwmaFastVoD: 4.0,        // Slower adaptation for VoD
          abrEwmaSlowVoD: 15.0,       // Much slower for VoD quality maintenance
          abrEwmaDefaultEstimate: 500000, // Conservative default estimate
          abrBandWidthFactor: 0.8,    // Be more conservative with bandwidth estimates
          abrBandWidthUpFactor: 0.7,  // Even more conservative for upward switches
          
          // Enable segment skipping on errors
          enableWorker: false, // Disable worker to avoid some edge case issues
          lowLatencyMode: false, // Disable low latency for better stability
        };

        if (isDirectAccess) {
            hlsConfig.xhrSetup = function(xhr, url) {
                xhr.setRequestHeader('User-Agent', navigator.userAgent);
                xhr.setRequestHeader('Accept', '*/*');
                xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
            };
            console.log('HLS config: Using direct access with custom headers.');
        }

        hlsInstance = new Hls(hlsConfig);

        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoRef.current);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('🎬 HLS Manifest parsed, levels:', data.levels);
          
          // Sort levels by height (resolution) in descending order to get highest quality first
          const sortedLevels = [...data.levels].sort((a, b) => {
            // Primary sort by height (resolution)
            if (b.height !== a.height) {
              return b.height - a.height;
            }
            // Secondary sort by bitrate if height is the same
            return b.bitrate - a.bitrate;
          });
          
          console.log('🎬 Sorted levels (highest first):', sortedLevels.map(l => `${l.height}p @ ${l.bitrate}bps`));
          
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
            console.log('🎬 Initial quality set to highest available:', 
              `${highestQualityLevel.height}p @ ${highestQualityLevel.bitrate}bps (HLS level ${highestQualityLevel.id})`);
          } else {
            // Fallback to level 0 if no qualities found
            hlsInstance.currentLevel = 0;
            setCurrentQuality('0');
            console.log('🎬 Fallback: Initial quality set to level 0');
          }
        });
        
        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          console.log('🎬 HLS Level switched to:', data.level);
          setCurrentQuality(data.level.toString());
        });

        // Enhanced error handling with segment skipping
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

        // Handle buffer stalled situations more aggressively
        hlsInstance.on(Hls.Events.BUFFER_STALLED_ERROR, (event, data) => {
          console.warn('⏸️ Buffer stalled - attempting immediate recovery...');
          
          // Clear the stalled timer and try gap jump
          if (gapJumpTimer) {
            clearTimeout(gapJumpTimer);
          }
          
          // Immediate gap jump attempt
          handleGapJump();
          
          // Set a backup timer for additional recovery
          gapJumpTimer = setTimeout(() => {
            console.log('⚡ Secondary stall recovery attempt');
            if (videoRef.current && !videoRef.current.paused) {
              const currentTime = videoRef.current.currentTime;
              videoRef.current.currentTime = currentTime + 1; // Jump 1 second forward
            }
          }, 2000);
        });

        // Track segment loading progress
        hlsInstance.on(Hls.Events.FRAG_LOADED, (event, data) => {
          // Successfully loaded segment - clear any error tracking for this segment
          const segmentKey = `${data.frag.level}-${data.frag.sn}`;
          setSegmentErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(segmentKey);
            return newMap;
          });
        });

        // Enhanced segment load error tracking
        hlsInstance.on(Hls.Events.FRAG_LOAD_ERROR, (event, data) => {
          const segmentKey = `${data.frag.level}-${data.frag.sn}`;
          
          setSegmentErrors(prev => {
            const newMap = new Map(prev);
            const errorCount = (newMap.get(segmentKey) || 0) + 1;
            newMap.set(segmentKey, errorCount);
            
            console.warn('📦 Fragment load error:', {
              url: data.frag?.url,
              level: data.frag?.level,
              sn: data.frag?.sn,
              errorCount,
              reason: data.reason,
              response: data.response
            });
            
            // More aggressive segment skipping for problematic segments
            if (errorCount >= 1) { // Reduced from 2 to 1 for faster skipping
              console.log('🦘 Segment failed, attempting immediate skip...');
              handleSegmentSkip(data.frag);
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

    // Function to handle gap jumping over problematic areas
    const handleGapJump = () => {
      if (!videoRef.current || !hlsInstance) return;
      
      const video = videoRef.current;
      const currentTime = video.currentTime;
      const buffered = video.buffered;
      
      console.log('🦘 Attempting gap jump from time:', currentTime);
      
      // Check if there's a buffered range ahead we can jump to
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i);
        const end = buffered.end(i);
        
        // If there's a gap and we can jump ahead
        if (start > currentTime + 0.1) {
          const jumpTo = start + 0.1;
          console.log(`🦘 Jumping gap: ${currentTime.toFixed(2)}s → ${jumpTo.toFixed(2)}s`);
          video.currentTime = jumpTo;
          return;
        }
      }
      
      // If no buffered range ahead, try a small forward seek
      const jumpTo = currentTime + 2; // Jump 2 seconds forward
      console.log(`🦘 No buffer ahead, small jump: ${currentTime.toFixed(2)}s → ${jumpTo.toFixed(2)}s`);
      video.currentTime = jumpTo;
    };

    // Function to skip over a specific problematic segment
    const handleSegmentSkip = (frag) => {
      if (!videoRef.current) return;
      
      const video = videoRef.current;
      const segmentDuration = frag.duration || 2; // Default 2 seconds if unknown
      const currentTime = video.currentTime;
      const skipTo = currentTime + segmentDuration;
      
      console.log(`🦘 Skipping problematic segment: ${currentTime.toFixed(2)}s → ${skipTo.toFixed(2)}s`);
      video.currentTime = skipTo;
    };

    // Helper function to handle fatal errors with progressive recovery
    const handleFatalError = (hlsInstance, data) => {
      console.log('🚨 FATAL ERROR RECOVERY INITIATED:', data.details);
      
      switch(data.type) {
        case 'networkError':
          console.log('🔄 Network error recovery: Restarting load...');
          try {
            hlsInstance.startLoad();
          } catch (error) {
            console.error('❌ Network recovery failed:', error);
            // Try a full restart as fallback
            setTimeout(() => {
              if (hlsInstance && videoRef.current) {
                hlsInstance.detachMedia();
                hlsInstance.attachMedia(videoRef.current);
                hlsInstance.startLoad();
              }
            }, 2000);
          }
          break;
          
        case 'mediaError':
          console.log('🔄 Media error recovery: Attempting progressive recovery...');
          
          // Handle specific media error types
          switch(data.details) {
            case 'bufferAppendError':
            case 'bufferAppendingError':
              console.log('📦 Buffer append error - attempting buffer recovery');
              try {
                // Try to recover the specific buffer that failed
                if (data.sourceBufferName) {
                  console.log(`🔧 Recovering ${data.sourceBufferName} buffer`);
                }
                hlsInstance.recoverMediaError();
              } catch (error) {
                console.error('❌ Buffer recovery failed, trying full restart:', error);
                handleFullRestart(hlsInstance);
              }
              break;
              
            case 'fragParsingError':
              console.log('📦 Fragment parsing error - skipping and recovering');
              if (data.frag) {
                handleSegmentSkip(data.frag);
              }
              try {
                hlsInstance.recoverMediaError();
              } catch (error) {
                console.error('❌ Fragment parsing recovery failed:', error);
                handleFullRestart(hlsInstance);
              }
              break;
              
            default:
              console.log('🔄 Generic media error recovery');
              try {
                hlsInstance.recoverMediaError();
              } catch (error) {
                console.error('❌ Media recovery failed, trying full restart:', error);
                handleFullRestart(hlsInstance);
              }
              break;
          }
          break;
          
        default:
          console.log('🔄 Generic fatal error: Attempting full recovery...');
          handleFullRestart(hlsInstance);
          break;
      }
    };

    // Helper function for full HLS restart
    const handleFullRestart = (hlsInstance) => {
      console.log('🔄 Performing full HLS restart...');
      
      if (hlsInstance && hlsInstance.media) {
        try {
          const currentTime = videoRef.current?.currentTime || 0;
          console.log('💾 Saving current time for restart:', currentTime);
          
          hlsInstance.detachMedia();
          
          setTimeout(() => {
            if (videoRef.current && hlsInstance) {
              console.log('🔌 Reattaching media and resuming playback');
              hlsInstance.attachMedia(videoRef.current);
              hlsInstance.startLoad();
              
              // Restore playback position after a short delay
              setTimeout(() => {
                if (videoRef.current && currentTime > 0) {
                  videoRef.current.currentTime = currentTime;
                  console.log('⏰ Restored playback position:', currentTime);
                }
              }, 1000);
            }
          }, 1500);
        } catch (error) {
          console.error('❌ Full restart failed:', error);
        }
      }
    };

    // Helper function to handle non-fatal errors
    const handleNonFatalError = (hlsInstance, data) => {
      console.log('⚠️ NON-FATAL ERROR HANDLING:', data.details);
      
      switch(data.details) {
        case 'fragLoadError':
          console.log('📦 Fragment load error - segment tracking will handle this');
          // Additional handling for persistent load errors
          if (data.frag) {
            const retryCount = data.frag.retryCount || 0;
            if (retryCount > 2) {
              console.log('🦘 Fragment has failed multiple retries, forcing skip');
              handleSegmentSkip(data.frag);
            }
          }
          break;
          
        case 'fragParsingError':
          console.log('📦 Fragment parsing error - corrupted segment detected');
          if (data.frag) {
            console.log('🦘 Immediately skipping corrupted segment');
            handleSegmentSkip(data.frag);
          }
          break;
          
        case 'fragLoadTimeOut':
          console.log('⏱️ Fragment load timeout - network issue detected');
          if (data.frag) {
            console.log('🦘 Skipping timed out segment');
            handleSegmentSkip(data.frag);
          }
          break;
          
        case 'levelLoadError':
          console.log('📋 Level load error - quality switching issue');
          // Try to switch to a different quality level
          if (hlsInstance.levels && hlsInstance.levels.length > 1) {
            const currentLevel = hlsInstance.currentLevel;
            const fallbackLevel = currentLevel > 0 ? currentLevel - 1 : hlsInstance.levels.length - 1;
            console.log(`🔄 Switching from level ${currentLevel} to ${fallbackLevel}`);
            hlsInstance.currentLevel = fallbackLevel;
          }
          break;
          
        case 'bufferStalledError':
          console.log('⏸️ Buffer stalled error - gap jumping will handle this');
          // Additional stall recovery is handled by the BUFFER_STALLED_ERROR event
          break;
          
        case 'bufferSeekOverHole':
        case 'bufferNudgeOnStall':
          console.log('🕳️ Buffer hole detected - allowing HLS.js auto-recovery');
          // Let HLS.js handle these automatically, but add backup
          setTimeout(() => {
            if (videoRef.current && videoRef.current.paused && !playerState.isPlaying) {
              console.log('🔄 Backup recovery: forcing play after buffer hole');
              videoRef.current.play().catch(console.error);
            }
          }, 3000);
          break;
          
        case 'bufferAppendingError':
          console.log('🔧 Buffer appending error - buffer management issue');
          // This is handled by the specific BUFFER_APPENDING_ERROR event
          break;
          
        default:
          console.log('🔄 Other non-fatal error, monitoring for escalation');
          // Keep track of non-fatal errors that might indicate bigger issues
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
      if (hlsInstance) {
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

  return { qualities, setQuality, currentQuality, hlsInstance: hls };
}; 