'use client'

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./MediaPlayer.module.css";
import { useSubtitles } from '../hooks/useSubtitles';
import { useMediaContext } from '../context/MediaContext';

// Enhanced subtitle selector component for both frontend and vm-server subtitles
const SubtitleSelector = ({ subtitles, activeSubtitle, onSubtitleSelect, loading, className }) => {
  const [selectedValue, setSelectedValue] = useState('off');
  
  // Build options from subtitle data (works with both frontend and vm-server formats)
  const buildOptions = () => {
    const options = [{ value: 'off', label: 'Off', type: 'off' }];
    
    if (!subtitles?.subtitles || subtitles.subtitles.length === 0) {
      return options;
    }
    
    // Add subtitles with enhanced labeling
    subtitles.subtitles.forEach((subtitle, index) => {
      const subtitleKey = `${subtitle.language || subtitle.languageName}_${index}`;
      const languageLabel = subtitle.languageName || subtitle.language || 'Unknown';
      
      // Quality indicators for different sources
      let qualityIndicator = '';
      if (subtitle.isVTT) {
        qualityIndicator += '✓ VTT';
      }
      if (subtitle.qualityScore) {
        qualityIndicator += ` (${subtitle.qualityScore}/100)`;
      }
      if (subtitle.source === 'opensubtitles') {
        qualityIndicator += ' 🌐 OpenSubtitles';
      } else if (subtitle.source === 'vm-server') {
        qualityIndicator += ' 🤖 VM-Server';
      }
      if (subtitle.downloads && subtitle.downloads > 0) {
        qualityIndicator += ` • ${subtitle.downloads} downloads`;
      }
      
      options.push({
        value: subtitleKey,
        label: `${languageLabel} ${qualityIndicator}`.trim(),
        type: 'subtitle',
        subtitle: subtitle
      });
    });
    
    return options;
  };
  
  const options = buildOptions();
  
  const handleChange = async (e) => {
    const value = e.target.value;
    setSelectedValue(value);
    
    if (value === 'off') {
      await onSubtitleSelect(null);
    } else {
      const option = options.find(opt => opt.value === value);
      if (option?.subtitle) {
        await onSubtitleSelect(option.subtitle);
      }
    }
  };
  
  // Update selected value when active subtitle changes
  useEffect(() => {
    if (!activeSubtitle) {
      setSelectedValue('off');
    } else {
      const subtitleKey = `${activeSubtitle.language}_${activeSubtitle.index || 0}`;
      setSelectedValue(subtitleKey);
    }
  }, [activeSubtitle]);
  
  return (
    <select 
      value={selectedValue}
      onChange={handleChange}
      className={className}
      disabled={loading}
    >
      {options.map((option) => (
        <option 
          key={option.value} 
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

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
  
  // VM-server subtitle state
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  
  // Legacy subtitle state (kept for compatibility with old UI elements)
  const [selectedSubtitle, setSelectedSubtitle] = useState('off'); // 'off' or subtitle index
  
  // Custom dropdown states
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  const [subtitleDropdownOpen, setSubtitleDropdownOpen] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  
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

  // Get media context for storing subtitle data
  const { 
    getMedia, 
    fetchDetailedMedia, 
    storeSubtitlesFromExtraction,
    getVideoPlayerSubtitles,
    hasSubtitleData
  } = useMediaContext();
  
  const [currentMedia, setCurrentMedia] = useState(null);

  // Use the new frontend-based subtitle system with IMDB ID
  const {
    subtitles,
    loading: subtitlesLoading,
    error: subtitlesError,
    hasSubtitles,
    getVideoPlayerTracks,
    getSubtitleForLanguage,
    getSubtitleInfo,
    // New frontend subtitle methods
    processSubtitle,
    getBestSubtitleForPlayer,
    refreshFromOpenSubtitles,
    hasImdbId,
    useFrontendSubtitles
  } = useSubtitles(movieId, {
    season: mediaType === 'tv' ? seasonId : null,
    episode: mediaType === 'tv' ? episodeId : null,
    imdbId: currentMedia?.imdb_id, // IMDB ID for OpenSubtitles API
    preferredLanguage: 'english',
    preferredLanguages: ['eng', 'spa', 'fre'], // Multi-language support
    useFrontendSubtitles: true, // Enable new frontend approach
    autoLoad: !!currentMedia?.imdb_id // Auto-load when IMDB ID is available
  });

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
    "🚀 Our VM service ensures consistent performance and reliability.",
    "📝 VM-server now automatically extracts subtitles from video players!"
  ];

  // Loading phases with estimated durations
  const loadingPhases = {
    initializing: { label: 'Initializing extraction service', progress: 5 },
    connecting: { label: 'Connecting to streaming server', progress: 15 },
    navigating: { label: 'Setting up browser environment', progress: 35 },
    bypassing: { label: 'Bypassing security measures', progress: 50 },
    extracting: { label: 'Extracting stream URLs', progress: 80 },
    subtitles: { label: 'Extracting subtitles', progress: 90 },
    validating: { label: 'Validating stream quality', progress: 93 },
    finalizing: { label: 'Preparing playback', progress: 95 },
    complete: { label: 'Stream ready!', progress: 100 }
  };

  // Apply subtitle to video element (supports both frontend and vm-server subtitles)
  const applySubtitleToVideo = useCallback(async (subtitle) => {
    if (!videoRef?.current) {
      console.warn('Cannot apply subtitle: missing video ref');
      return false;
    }
    
    try {
      console.log('🎬 Applying subtitle to video:', {
        language: subtitle.languageName || subtitle.language,
        format: subtitle.format,
        source: subtitle.source,
        hasContent: !!subtitle.content,
        hasBlobUrl: !!subtitle.blobUrl,
        isProcessed: !!subtitle.processed
      });
      
      // Remove existing tracks
      const existingTracks = videoRef.current.querySelectorAll('track');
      existingTracks.forEach(track => track.remove());
      
      let processedSubtitle = subtitle;
      
      // For frontend subtitles that aren't processed yet, process them first
      if (subtitle.source === 'opensubtitles' && !subtitle.processed && !subtitle.content && processSubtitle) {
        try {
          console.log('🔄 Processing frontend subtitle before applying...');
          processedSubtitle = await processSubtitle(subtitle);
          console.log('✅ Frontend subtitle processed successfully');
        } catch (processError) {
          console.error('❌ Failed to process frontend subtitle:', processError);
          // Continue with original subtitle
        }
      }
      
      // Determine the source URL - prefer blob URL to avoid CORS
      let subtitleSrc = null;
      
      if (processedSubtitle.content) {
        // Create blob URL from VTT content to avoid CORS issues
        try {
          const blob = new Blob([processedSubtitle.content], { type: 'text/vtt' });
          subtitleSrc = URL.createObjectURL(blob);
          console.log('✅ Created blob URL for subtitle content');
        } catch (blobError) {
          console.error('❌ Failed to create blob URL:', blobError);
          // Fallback to original URL (may cause CORS issues)
          subtitleSrc = processedSubtitle.url || processedSubtitle.downloadLink;
        }
      } else if (processedSubtitle.blobUrl) {
        // Use existing blob URL
        subtitleSrc = processedSubtitle.blobUrl;
        console.log('✅ Using existing blob URL');
      } else if (processedSubtitle.url || processedSubtitle.downloadLink) {
        // Fallback to original URL (may cause CORS issues)
        subtitleSrc = processedSubtitle.url || processedSubtitle.downloadLink;
        console.warn('⚠️ Using original URL (may cause CORS issues)');
      }
      
      if (!subtitleSrc) {
        console.error('❌ No valid subtitle source available');
        return false;
      }
      
      // Create new track element
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.src = subtitleSrc;
      track.srclang = processedSubtitle.iso639 || 'en';
      track.label = processedSubtitle.languageName || processedSubtitle.language;
      track.default = true;
      
      console.log('🎯 Adding subtitle track to video:', {
        language: track.label,
        srcLang: track.srclang,
        usedBlobUrl: subtitleSrc.startsWith('blob:'),
        source: processedSubtitle.source
      });
      
      // Add track to video element
      videoRef.current.appendChild(track);
      
      // Enable the track
      setTimeout(() => {
        if (videoRef.current?.textTracks?.length > 0) {
          const addedTrack = videoRef.current.textTracks[videoRef.current.textTracks.length - 1];
          addedTrack.mode = 'showing';
          console.log('✅ Subtitle track enabled:', track.label);
        }
      }, 100);
      
      // Track error handling
      track.addEventListener('error', (error) => {
        console.error('❌ Subtitle track error:', error);
      });
      
      track.addEventListener('load', () => {
        console.log('✅ Subtitle track loaded successfully');
      });
      
      setActiveSubtitle({
        ...processedSubtitle,
        appliedSrc: subtitleSrc,
        usedBlobUrl: subtitleSrc.startsWith('blob:')
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to apply subtitle:', error);
      return false;
    }
  }, [videoRef, processSubtitle]);

  // Handle subtitle selection
  const handleSubtitleSelect = useCallback(async (subtitle) => {
    if (!subtitle) {
      // Turn off subtitles
      if (videoRef?.current) {
        const existingTracks = videoRef.current.querySelectorAll('track');
        existingTracks.forEach(track => track.remove());
      }
      setActiveSubtitle(null);
      setSelectedSubtitle('off');
      return true;
    }
    
    const success = applySubtitleToVideo(subtitle);
    if (success) {
      setSelectedSubtitle(`${subtitle.language}_${subtitle.index || 0}`);
    }
    return success;
  }, [applySubtitleToVideo]);

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

  // Fetch media data for subtitle integration
  useEffect(() => {
    const fetchMediaData = async () => {
      if (!movieId) return;
      
      try {
        console.log('🎬 Fetching media data:', { movieId, mediaType });
        const mediaData = await fetchDetailedMedia(movieId, mediaType);
        
        if (mediaData) {
          console.log('🎬 Media data fetched with IMDB ID:', mediaData.imdb_id);
          setCurrentMedia(mediaData);
        }
      } catch (error) {
        console.error('🎬 Failed to fetch media data:', error);
      }
    };

    fetchMediaData();
  }, [movieId, mediaType, fetchDetailedMedia]);

  // Auto-initialize subtitles when they become available
  useEffect(() => {
    const initializeSubtitles = async () => {
      if (!subtitles?.subtitles?.length || !videoRef.current || activeSubtitle) {
        return; // No subtitles available, no video element, or subtitles already active
      }

      try {
        console.log('🎬 Auto-initializing subtitles:', {
          subtitlesCount: subtitles.subtitles.length,
          source: subtitles.source,
          hasImdbId,
          useFrontendSubtitles
        });

        // Get the best English subtitle
        const bestSubtitle = await getBestSubtitleForPlayer('english');
        
        if (bestSubtitle) {
          console.log('✅ Found best subtitle for auto-initialization:', {
            language: bestSubtitle.languageName,
            format: bestSubtitle.format,
            quality: bestSubtitle.qualityScore,
            hasContent: !!bestSubtitle.content,
            hasBlobUrl: !!bestSubtitle.blobUrl,
            source: bestSubtitle.source
          });

          // Apply the subtitle to video
          const success = await handleSubtitleSelect(bestSubtitle);
          if (success) {
            console.log('🎯 Subtitles auto-initialized successfully');
          }
        } else {
          console.log('⚠️ No suitable subtitle found for auto-initialization');
        }
      } catch (error) {
        console.error('❌ Failed to auto-initialize subtitles:', error);
      }
    };

    // Small delay to ensure video element is ready
    const timer = setTimeout(initializeSubtitles, 1000);
    return () => clearTimeout(timer);
  }, [subtitles, getBestSubtitleForPlayer, handleSubtitleSelect, activeSubtitle, hasImdbId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[class*="customDropdown"]')) {
        setQualityDropdownOpen(false);
        setSubtitleDropdownOpen(false);
        setServerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    // Only start extraction if we have valid content to extract
    if (!movieId || (mediaType === 'tv' && (!seasonId || !episodeId))) {
      console.log('⏸️ Skipping extraction - missing required parameters:', {
        movieId, mediaType, seasonId, episodeId
      });
      return;
    }
    
    let isMounted = true; // Track if component is still mounted
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        extractAndSetupStream();
      }
    }, 100);

    const extractAndSetupStream = async () => {
      // Check if component is still mounted before starting
      if (!isMounted) return;
      
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
          if (localProgress < 100 && !localExtractionCompleted && isMounted) {
            console.error('❌ Extraction timeout after 90 seconds');
            setError('Extraction timeout - please try again or switch servers');
            setLoading(false);
            setProgressEventSource(null);
          }
          eventSource.close();
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
            
            // Update UI based on real-time VM progress (only if component is mounted)
            if (isMounted) {
              if (data.phase) setLoadingPhase(data.phase);
              if (typeof data.progress === 'number') setLoadingProgress(data.progress);
              if (data.message) setExtractionStep(data.message);
            }
            
            // Time remaining is calculated by the timer useEffect, no need to duplicate here
            
            // Handle completion
            if (data.phase === 'complete') {
              console.log('🎯 Completion phase detected!', data);
              
              // Mark completion immediately in local variable
              localExtractionCompleted = true;
              localProgress = 100;
              
              // Only proceed if component is still mounted
              if (!isMounted) {
                eventSource.close();
                return;
              }
              
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
              
              // Store subtitle data from vm-server in MediaContext
              const cacheKey = `${movieId}_${mediaType === 'tv' ? seasonId : 'movie'}_${mediaType === 'tv' ? episodeId : '0'}`;
              
              if (extractData.subtitles && extractData.subtitles.found > 0) {
                console.log('📝 Storing subtitle data from vm-server:', extractData.subtitles);
                storeSubtitlesFromExtraction(extractData, cacheKey);
                
                // Auto-select English subtitle if available
                setTimeout(() => {
                  if (extractData.subtitles.urls && extractData.subtitles.urls.length > 0) {
                    const englishSubtitle = extractData.subtitles.urls.find(sub => 
                      sub.language === 'english' || sub.language === 'en'
                    );
                    
                    if (englishSubtitle) {
                      console.log('🎬 Auto-selecting English subtitle from vm-server');
                      // Create a formatted subtitle object for the video player
                      const formattedSubtitle = {
                        ...englishSubtitle,
                        languageName: 'English',
                        iso639: 'en'
                      };
                      handleSubtitleSelect(formattedSubtitle);
                    } else {
                      // Fallback to first available subtitle
                      console.log('🎬 Auto-selecting first available subtitle from vm-server');
                      const firstSubtitle = {
                        ...extractData.subtitles.urls[0],
                        languageName: extractData.subtitles.urls[0].language === 'spanish' ? 'Spanish' : 
                                    extractData.subtitles.urls[0].language === 'french' ? 'French' : 
                                    extractData.subtitles.urls[0].language || 'Unknown',
                        iso639: extractData.subtitles.urls[0].language === 'spanish' ? 'es' : 
                               extractData.subtitles.urls[0].language === 'french' ? 'fr' : 'en'
                      };
                      handleSubtitleSelect(firstSubtitle);
                    }
                  }
                }, 2000); // Wait for video to be ready
              } else {
                console.log('📝 No subtitles found in vm-server response');
              }
              
              // Note: Now using vm-server subtitle data instead of OpenSubtitles API
              console.log('📝 VM-server subtitle extraction completed');
              
              // Initialize subtitle selection as off - vm-server subtitles will be available if found
              if (isMounted) {
                setSelectedSubtitle('off');
                console.log('🎯 Subtitles initialized - vm-server subtitles available if extracted');
              }
              
              // Only update state if component is still mounted
              if (isMounted) {
                setStreamUrl(finalStreamUrl);
                setRequestId(extractData.requestId);
                
                // Determine stream type
                const isHLS = extractData.streamUrl.includes('.m3u8') || extractData.type === 'hls';
                console.log('🎥 Setting stream type:', isHLS ? 'hls' : 'mp4');
                setStreamType(isHLS ? 'hls' : 'mp4');
                setExtractionCompleted(true);
              }
              
              console.log('✅ Stream extraction completed successfully:', {
                server,
                originalUrl: extractData.streamUrl,
                finalUrl: finalStreamUrl,
                streamType: extractData.streamUrl.includes('.m3u8') || extractData.type === 'hls' ? 'hls' : 'mp4',
                requestId: extractData.requestId,
                totalFound: extractData.totalFound,
                m3u8Count: extractData.m3u8Count
              });
              
              // Complete loading after brief delay
              setTimeout(() => {
                clearTimeout(timeoutId);
                if (isMounted) {
                  setLoading(false);
                  setProgressEventSource(null);
                }
                eventSource.close();
              }, 800);
              
              return; // Exit handler after successful completion
            }
            
            // Handle auto-switch scenario
            if (data.phase === 'autoswitch') {
              console.log('🔄 Auto-switching server:', data);
              
              if (isMounted) {
                setAutoSwitching(true);
                setExtractionStep(data.message);
              }
              
              // Switch to embed.su after brief delay
              setTimeout(() => {
                clearTimeout(timeoutId);
                if (isMounted) {
                  setAutoSwitching(false);
                  setServer("Embed.su");
                  setProgressEventSource(null);
                }
                eventSource.close();
              }, 2000);
              return;
            }
            
            // Handle errors
            if (data.error) {
              console.error('❌ Real-time progress error:', data);
              clearTimeout(timeoutId);
              
              if (isMounted) {
                setError(data.message || 'Stream extraction failed');
                setLoading(false);
                setProgressEventSource(null);
              }
              
              eventSource.close();
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
            
            if (isMounted) {
              setError(`Connection lost during extraction (progress: ${localProgress || loadingProgress}%)`);
              setLoading(false);
            }
          } else {
            console.log('✅ Ignoring error - extraction was successful or nearly complete');
          }
          
          eventSource.close();
          setProgressEventSource(null);
        };
        
      } catch (err) {
        console.error('Stream extraction setup error:', err);
        
        if (isMounted) {
          setError('Failed to initialize stream extraction');
          setLoading(false);
        }
      }
    };

    return () => {
      isMounted = false; // Mark component as unmounted
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

  // Note: Subtitle application is now handled by the useSubtitles hook
  // The old subtitle processing code has been removed

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

  // Comprehensive cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up MediaPlayer component on unmount...');
      
      // Clean up HLS instance
      if (hlsInstance) {
        console.log('🧹 Destroying HLS instance on unmount');
        hlsInstance.destroy();
      }
      
      // Close EventSource connection
      if (progressEventSource) {
        console.log('🧹 Closing progress EventSource on unmount');
        progressEventSource.close();
      }
      
      // Pause and reset video element
      if (videoRef.current) {
        console.log('🧹 Pausing and resetting video element on unmount');
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.src = '';
        videoRef.current.load(); // Reset video element
      }
    };
  }, []); // Empty dependency array - only run on unmount

  // Clean up when switching to different content (but don't auto-start extraction)
  useEffect(() => {
    console.log('🔄 MediaPlayer props changed, cleaning up previous state...');
    
    // Clean up existing connections/instances
    if (hlsInstance) {
      console.log('🧹 Destroying existing HLS instance on prop change');
      hlsInstance.destroy();
      setHlsInstance(null);
    }
    
    if (progressEventSource) {
      console.log('🧹 Closing existing EventSource on prop change');
      progressEventSource.close();
      setProgressEventSource(null);
    }
    
    // Reset video element
    if (videoRef.current) {
      console.log('🧹 Resetting video element on prop change');
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
      videoRef.current.load();
    }
    
    // Reset stream-related state (but keep loading as false to prevent auto-extraction)
    setStreamUrl(null);
    setError(null);
    setStreamType(null);
    setQualities([]);
    setSelectedQuality(-1);
    setAutoSwitching(false);
    setVideoDuration(0);
    setExtractionStep("");
    setRequestId(null);
    
    // Reset subtitle state
    setSelectedSubtitle('off');
    
    // Reset enhanced loading state
    setLoadingProgress(0);
    setLoadingPhase('initializing');
    setTimeElapsed(0);
    setEstimatedTimeRemaining(20);
    setLoadingStartTime(null);
    setCurrentFactIndex(0);
    setExtractionCompleted(false);
    
    // Note: We don't reset server or set loading=true here to prevent auto-extraction
  }, [mediaType, movieId, seasonId, episodeId]); // Clean up when content changes

  const handleServerChange = (newServer) => {
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
      
      // Clean up current episode state before switching
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      // Clean up HLS instance
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
      
      // Close EventSource connection
      if (progressEventSource) {
        progressEventSource.close();
        setProgressEventSource(null);
      }
      
      onEpisodeChange(seasonId, episodeId + 1);
    }
  };

  const handlePreviousEpisode = () => {
    if (episodeId > 1) {
      console.log(`Moving to previous episode: S${seasonId}E${episodeId - 1}`);
      
      // Clean up current episode state before switching
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      // Clean up HLS instance
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
      
      // Close EventSource connection
      if (progressEventSource) {
        progressEventSource.close();
        setProgressEventSource(null);
      }
      
      onEpisodeChange(seasonId, episodeId - 1);
    }
  };

  const handleBackToShowDetails = () => {
    console.log(`Returning to show details for season ${seasonId}`);
    
    // Clean up current playback state before navigating
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    // Clean up HLS instance
    if (hlsInstance) {
      hlsInstance.destroy();
      setHlsInstance(null);
    }
    
    // Close EventSource connection
    if (progressEventSource) {
      progressEventSource.close();
      setProgressEventSource(null);
    }
    
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

  // Responsive SVG dimensions - these will scale with CSS
  const svgSize = 100; // Base size - CSS will scale with var(--spinner-size)
  const strokeWidth = 3;
  const radius = (svgSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={styles.mediaContainer}>
      <div className={styles.mediaPlayer}>
        {(loading || autoSwitching) && (
          <div className={styles.loadingContainer}>
            <div className={styles.enhancedLoadingInterface}>
              {/* Main spinner with progress ring */}
              <div className={styles.progressSpinnerContainer}>
                <div className={styles.loadingSpinner}></div>
                <svg 
                  className={styles.progressRing} 
                  width={svgSize} 
                  height={svgSize}
                  viewBox={`0 0 ${svgSize} ${svgSize}`}
                >
                  <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    stroke="rgba(59, 130, 246, 0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  <circle
                    className={styles.progressRingProgress}
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    stroke="#3b82f6"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * loadingProgress) / 100}
                    transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
                  />
                </svg>
                
                {/* Progress percentage */}
                <div className={styles.progressPercentage}>
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
        
        <div className={styles.videoContainer} style={{ display: (streamUrl && !loading && !error && !autoSwitching) ? 'flex' : 'none' }}>            
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
                console.log('Video duration loaded: ' + Math.round(duration / 60) + ' minutes');
              }}
              onDurationChange={(e) => {
                const duration = e.target.duration;
                setVideoDuration(duration);
                console.log('Video duration updated: ' + Math.round(duration / 60) + ' minutes');
              }}
              crossOrigin="anonymous"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>

            <div className={styles.videoOverlay}>
              {/* Remove stream info overlay since it's now in the controls section below */}
            </div>
          </div>
          
          {/* Combined Media Controls and Navigation - Below Video */}
          {streamUrl && !loading && !error && !autoSwitching && (
            <div className={styles.mediaControls}>
            {streamType === 'hls' && qualities.length > 0 && (
              <div className={styles.controlGroup}>
                <label htmlFor="quality" className={styles.controlLabel}>Quality</label>
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

            {/* Enhanced subtitle integration - Frontend + VM-Server */}
            <div className={styles.controlGroup}>
              <label htmlFor="subtitles" className={`${styles.controlLabel} ${styles.subtitleLabel}`}>
                Subtitles 
                {useFrontendSubtitles && hasImdbId && (
                  <span className={styles.frontendIndicator}>🌐 OpenSubtitles</span>
                )}
                {!hasImdbId && (
                  <span className={styles.noImdbIndicator}>⚠️ No IMDB ID</span>
                )}
                {subtitlesLoading && <span className={styles.loadingIndicator}>⟳</span>}
                {subtitlesError && <span className={styles.errorIndicator}>❌</span>}
              </label>
              
              <div className={styles.subtitleControls}>
                {!subtitles || (subtitles && (!subtitles.subtitles || subtitles.subtitles.length === 0)) ? (
                  <select disabled className={styles.subtitleDropdown}>
                    <option>
                      {!hasImdbId ? 'No IMDB ID - fetch media data first' : 
                       subtitlesLoading ? 'Loading subtitles...' : 
                       'No subtitles available'}
                    </option>
                  </select>
                ) : (
                  <SubtitleSelector 
                    subtitles={subtitles}
                    activeSubtitle={activeSubtitle}
                    onSubtitleSelect={handleSubtitleSelect}
                    loading={subtitlesLoading}
                    className={styles.subtitleDropdown}
                  />
                )}
                
                {/* Refresh button for OpenSubtitles */}
                {hasImdbId && refreshFromOpenSubtitles && (
                  <button 
                    onClick={() => refreshFromOpenSubtitles(true)}
                    disabled={subtitlesLoading}
                    className={styles.refreshButton}
                    title="Refresh subtitles from OpenSubtitles"
                  >
                    🔄
                  </button>
                )}
              </div>
              
              {/* Active subtitle info */}
              {activeSubtitle && (
                <div className={styles.subtitleInfo}>
                  <span className={styles.subtitleMeta}>
                    🎬 {activeSubtitle.languageName || activeSubtitle.language}
                    {activeSubtitle.isVTT && ' ✓ VTT'}
                    {activeSubtitle.qualityScore && ` (${activeSubtitle.qualityScore}/100)`}
                    {activeSubtitle.source === 'opensubtitles' && ' • OpenSubtitles'}
                    {activeSubtitle.source === 'vm-server' && ' • VM-Server'}
                    {activeSubtitle.usedBlobUrl && ' • CORS-Free'}
                  </span>
                </div>
              )}
              
              {/* Subtitle statistics */}
              {subtitles && subtitles.subtitles && subtitles.subtitles.length > 0 && (
                <div className={styles.subtitleStats}>
                  <span className={styles.statText}>
                    {subtitles.subtitles.length} subtitle{subtitles.subtitles.length !== 1 ? 's' : ''} 
                    {subtitles.source?.includes('opensubtitles') ? ' from OpenSubtitles API' : 
                     subtitles.source?.includes('vm-server') ? ' from VM-Server' : ' available'}
                  </span>
                  {currentMedia?.imdb_id && (
                    <span className={styles.imdbInfo}>
                      • IMDB: {currentMedia.imdb_id}
                    </span>
                  )}
                </div>
              )}
              
              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && getSubtitleInfo && (
                <div className={styles.debugInfo}>
                  {(() => {
                    const info = getSubtitleInfo();
                    return info ? (
                      <span className={styles.debugText}>
                        Debug: {info.isFromFrontend ? 'Frontend' : 'VM-Server'} • 
                        {info.blobUrlsCreated} blob URLs • 
                        {info.hasImdbId ? 'Has IMDB' : 'No IMDB'}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Server selector is always visible */}
            <div className={styles.controlGroup}>
              <label htmlFor="server" className={styles.controlLabel}>Server</label>
              <select 
                id="server" 
                value={server} 
                onChange={(e) => handleServerChange(e.target.value)}
                disabled={loading || autoSwitching}
                className={styles.serverDropdown}
              >
                <option value="Vidsrc.xyz">Vidsrc.xyz</option>
                <option value="Embed.su">Embed.su</option>
              </select>
            </div>

            {/* Navigation Controls combined in same row */}
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>Navigation</label>
              <div className={styles.navigationButtons}>
                <button 
                  onClick={handleBackToShowDetails} 
                  className={styles.navButton}
                  disabled={loading || autoSwitching}
                >
                  Back
                </button>
                
                {mediaType === "tv" && (
                  <>
                    <button
                      onClick={handlePreviousEpisode}
                      disabled={episodeId <= 1 || loading || autoSwitching}
                      className={episodeId <= 1 ? styles.navButton + " " + styles.disabled : styles.navButton}
                    >
                      Previous
                    </button>
                    <span className={styles.episodeInfo}>S{seasonId}E{episodeId}</span>
                    <button
                      onClick={handleNextEpisode}
                      disabled={episodeId >= maxEpisodes || loading || autoSwitching}
                      className={episodeId >= maxEpisodes ? styles.navButton + " " + styles.disabled : styles.navButton}
                    >
                      Next
                    </button>
                  </>
                )}
              </div>
            </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MediaPlayer;
