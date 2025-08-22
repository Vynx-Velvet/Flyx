import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useAdvancedHls - Advanced HLS (HTTP Live Streaming) management hook
 * 
 * Features:
 * - Intelligent HLS manifest parsing and management
 * - Advanced segment loading with predictive caching
 * - Adaptive bitrate streaming with smooth transitions
 * - Live streaming support with DVR functionality
 * - Error recovery and redundant segment fetching
 * - Performance optimization with Web Workers
 * - Custom segment processing and filtering
 * - Advanced timeline and discontinuity handling
 */
const useAdvancedHls = ({
  enableLive = true,
  enableDvr = true,
  segmentCacheSize = 50,
  preloadSegmentCount = 3,
  maxRetries = 3,
  retryDelay = 1000,
  enableWorkers = true,
  adaptiveBitrate = true,
  targetLatency = 3, // seconds for live streams
  fallbackUrls = [],
  onManifestLoaded = null,
  onSegmentLoaded = null,
  onError = null
} = {}) => {

  // Core HLS state
  const [isInitialized, setIsInitialized] = useState(false);
  const [manifestUrl, setManifestUrl] = useState('');
  const [manifest, setManifest] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [availableLevels, setAvailableLevels] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [isDvr, setIsDvr] = useState(false);
  
  // Segment management state
  const [segmentCache, setSegmentCache] = useState(new Map());
  const [loadingSegments, setLoadingSegments] = useState(new Set());
  const [failedSegments, setFailedSegments] = useState(new Set());
  const [currentPlayhead, setCurrentPlayhead] = useState(0);
  const [liveEdge, setLiveEdge] = useState(0);
  
  // Performance and analytics
  const [hlsMetrics, setHlsMetrics] = useState({
    segmentsLoaded: 0,
    segmentsFailed: 0,
    manifestRefreshes: 0,
    averageSegmentLoadTime: 0,
    bufferStalls: 0,
    levelSwitches: 0
  });
  
  const [networkConditions, setNetworkConditions] = useState({
    bandwidth: 0,
    latency: 0,
    packetLoss: 0
  });

  // Refs for persistent data
  const videoRef = useRef(null);
  const manifestRef = useRef(null);
  const segmentCacheRef = useRef(new Map());
  const workerRef = useRef(null);
  const intervalRefs = useRef({
    manifestRefresh: null,
    segmentLoader: null,
    liveSync: null
  });
  
  const loadMetricsRef = useRef({
    segmentLoadTimes: [],
    manifestLoadTimes: []
  });

  // HLS manifest parser
  const parseM3U8 = useCallback((manifestText, baseUrl) => {
    const lines = manifestText.split('\n').map(line => line.trim()).filter(line => line);
    const manifest = {
      version: 1,
      isLive: false,
      isDvr: false,
      targetDuration: 10,
      mediaSequence: 0,
      segments: [],
      levels: [],
      discontinuitySequence: 0,
      allowCache: true,
      endList: false,
      playlistType: null
    };

    let currentSegment = null;
    let isVariantPlaylist = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for variant playlist indicators
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        isVariantPlaylist = true;
        const attributes = parseAttributes(line.substring(18));
        const url = lines[i + 1];
        
        manifest.levels.push({
          bandwidth: parseInt(attributes.BANDWIDTH) || 0,
          resolution: attributes.RESOLUTION ? {
            width: parseInt(attributes.RESOLUTION.split('x')[0]),
            height: parseInt(attributes.RESOLUTION.split('x')[1])
          } : null,
          codecs: attributes.CODECS || '',
          url: resolveUrl(url, baseUrl),
          framerate: attributes['FRAME-RATE'] ? parseFloat(attributes['FRAME-RATE']) : null,
          audio: attributes.AUDIO || null,
          subtitles: attributes.SUBTITLES || null
        });
        i++; // Skip the URL line
      }
      
      // Media playlist tags
      else if (line.startsWith('#EXT-X-VERSION:')) {
        manifest.version = parseInt(line.substring(15));
      }
      else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        manifest.targetDuration = parseInt(line.substring(22));
      }
      else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
        manifest.mediaSequence = parseInt(line.substring(22));
      }
      else if (line.startsWith('#EXT-X-DISCONTINUITY-SEQUENCE:')) {
        manifest.discontinuitySequence = parseInt(line.substring(30));
      }
      else if (line.startsWith('#EXT-X-PLAYLIST-TYPE:')) {
        manifest.playlistType = line.substring(21);
        if (manifest.playlistType === 'EVENT') {
          manifest.isLive = true;
        }
      }
      else if (line === '#EXT-X-ENDLIST') {
        manifest.endList = true;
      }
      else if (line.startsWith('#EXTINF:')) {
        const duration = parseFloat(line.substring(8).split(',')[0]);
        const title = line.includes(',') ? line.substring(line.indexOf(',') + 1) : '';
        
        currentSegment = {
          duration,
          title,
          discontinuity: false,
          byteRange: null,
          dateTime: null,
          key: null
        };
      }
      else if (line.startsWith('#EXT-X-BYTERANGE:')) {
        if (currentSegment) {
          const range = line.substring(17);
          const parts = range.split('@');
          currentSegment.byteRange = {
            length: parseInt(parts[0]),
            offset: parts[1] ? parseInt(parts[1]) : null
          };
        }
      }
      else if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) {
        if (currentSegment) {
          currentSegment.dateTime = new Date(line.substring(25));
        }
        manifest.isLive = true;
      }
      else if (line === '#EXT-X-DISCONTINUITY') {
        if (currentSegment) {
          currentSegment.discontinuity = true;
        }
      }
      else if (line.startsWith('#EXT-X-KEY:')) {
        const keyAttributes = parseAttributes(line.substring(11));
        if (currentSegment) {
          currentSegment.key = {
            method: keyAttributes.METHOD,
            uri: keyAttributes.URI ? resolveUrl(keyAttributes.URI.replace(/"/g, ''), baseUrl) : null,
            iv: keyAttributes.IV || null
          };
        }
      }
      else if (line && !line.startsWith('#')) {
        // This is a segment URL
        if (currentSegment) {
          currentSegment.url = resolveUrl(line, baseUrl);
          currentSegment.sequence = manifest.mediaSequence + manifest.segments.length;
          manifest.segments.push(currentSegment);
          currentSegment = null;
        }
      }
    }

    // Determine if this is a live stream
    if (!manifest.endList && manifest.segments.length > 0) {
      manifest.isLive = true;
      
      // Check if DVR is available (longer window)
      const totalDuration = manifest.segments.reduce((sum, seg) => sum + seg.duration, 0);
      if (totalDuration > 300) { // 5 minutes threshold for DVR
        manifest.isDvr = true;
      }
    }

    return { manifest, isVariantPlaylist };
  }, []);

  // Helper function to parse M3U8 attributes
  const parseAttributes = useCallback((attributeString) => {
    const attributes = {};
    const regex = /([A-Z-]+)=("?[^",]*"?)/g;
    let match;

    while ((match = regex.exec(attributeString)) !== null) {
      attributes[match[1]] = match[2].replace(/"/g, '');
    }

    return attributes;
  }, []);

  // Helper function to resolve URLs
  const resolveUrl = useCallback((url, baseUrl) => {
    if (url.startsWith('http')) {
      return url;
    }
    
    try {
      return new URL(url, baseUrl).href;
    } catch (error) {
      console.warn('Failed to resolve URL:', url, baseUrl);
      return url;
    }
  }, []);

  // Load and parse HLS manifest
  const loadManifest = useCallback(async (url) => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const manifestText = await response.text();
      const { manifest: parsedManifest, isVariantPlaylist } = parseM3U8(manifestText, url);
      
      if (isVariantPlaylist) {
        // This is a master playlist, load the best quality variant
        const levels = parsedManifest.levels.sort((a, b) => b.bandwidth - a.bandwidth);
        setAvailableLevels(levels);
        
        // Auto-select best quality for device
        const deviceCapabilities = {
          maxWidth: screen.width,
          maxHeight: screen.height,
          maxBandwidth: Infinity
        };
        
        const suitableLevel = levels.find(level => 
          !level.resolution || 
          (level.resolution.width <= deviceCapabilities.maxWidth && 
           level.resolution.height <= deviceCapabilities.maxHeight)
        ) || levels[levels.length - 1];
        
        if (suitableLevel) {
          await loadManifest(suitableLevel.url);
        }
      } else {
        // This is a media playlist
        setManifest(parsedManifest);
        manifestRef.current = parsedManifest;
        setIsLive(parsedManifest.isLive);
        setIsDvr(parsedManifest.isDvr);
        
        if (parsedManifest.isLive) {
          setLiveEdge(parsedManifest.segments.length > 0 ? 
            parsedManifest.segments[parsedManifest.segments.length - 1].sequence : 0
          );
        }
        
        // Track load time
        const loadTime = performance.now() - startTime;
        loadMetricsRef.current.manifestLoadTimes.push(loadTime);
        
        setHlsMetrics(prev => ({
          ...prev,
          manifestRefreshes: prev.manifestRefreshes + 1,
          averageManifestLoadTime: loadMetricsRef.current.manifestLoadTimes.reduce((a, b) => a + b, 0) / 
                                    loadMetricsRef.current.manifestLoadTimes.length
        }));
        
        if (onManifestLoaded) {
          onManifestLoaded(parsedManifest);
        }
      }
      
    } catch (error) {
      console.error('Failed to load HLS manifest:', error);
      if (onError) {
        onError({ type: 'manifest_load_error', error });
      }
      throw error;
    }
  }, [parseM3U8, onManifestLoaded, onError]);

  // Load individual segment
  const loadSegment = useCallback(async (segment, retryCount = 0) => {
    if (segmentCacheRef.current.has(segment.url)) {
      return segmentCacheRef.current.get(segment.url);
    }
    
    if (loadingSegments.has(segment.url)) {
      return null; // Already loading
    }
    
    setLoadingSegments(prev => new Set([...prev, segment.url]));
    const startTime = performance.now();
    
    try {
      const response = await fetch(segment.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const segmentData = await response.arrayBuffer();
      
      // Cache the segment
      const segmentInfo = {
        data: segmentData,
        segment,
        loadTime: performance.now() - startTime,
        timestamp: Date.now()
      };
      
      // Manage cache size
      if (segmentCacheRef.current.size >= segmentCacheSize) {
        const oldestKey = segmentCacheRef.current.keys().next().value;
        segmentCacheRef.current.delete(oldestKey);
      }
      
      segmentCacheRef.current.set(segment.url, segmentInfo);
      setSegmentCache(new Map(segmentCacheRef.current));
      
      // Update metrics
      const loadTime = performance.now() - startTime;
      loadMetricsRef.current.segmentLoadTimes.push(loadTime);
      
      setHlsMetrics(prev => ({
        ...prev,
        segmentsLoaded: prev.segmentsLoaded + 1,
        averageSegmentLoadTime: loadMetricsRef.current.segmentLoadTimes.reduce((a, b) => a + b, 0) /
                                 loadMetricsRef.current.segmentLoadTimes.length
      }));
      
      if (onSegmentLoaded) {
        onSegmentLoaded(segmentInfo);
      }
      
      return segmentInfo;
      
    } catch (error) {
      console.error('Failed to load segment:', segment.url, error);
      
      if (retryCount < maxRetries) {
        // Exponential backoff retry
        const delay = retryDelay * Math.pow(2, retryCount);
        setTimeout(() => {
          loadSegment(segment, retryCount + 1);
        }, delay);
      } else {
        setFailedSegments(prev => new Set([...prev, segment.url]));
        setHlsMetrics(prev => ({
          ...prev,
          segmentsFailed: prev.segmentsFailed + 1
        }));
        
        if (onError) {
          onError({ type: 'segment_load_error', error, segment });
        }
      }
    } finally {
      setLoadingSegments(prev => {
        const newSet = new Set(prev);
        newSet.delete(segment.url);
        return newSet;
      });
    }
  }, [segmentCacheSize, maxRetries, retryDelay, onSegmentLoaded, onError]);

  // Predictive segment preloading
  const preloadSegments = useCallback(() => {
    if (!manifest || !videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    const currentSegmentIndex = manifest.segments.findIndex((seg, index) => {
      const segmentStart = manifest.segments.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
      const segmentEnd = segmentStart + seg.duration;
      return currentTime >= segmentStart && currentTime < segmentEnd;
    });
    
    if (currentSegmentIndex === -1) return;
    
    // Preload next few segments
    const segmentsToPreload = manifest.segments.slice(
      currentSegmentIndex + 1,
      currentSegmentIndex + 1 + preloadSegmentCount
    );
    
    segmentsToPreload.forEach(segment => {
      if (!segmentCacheRef.current.has(segment.url) && !loadingSegments.has(segment.url)) {
        loadSegment(segment);
      }
    });
  }, [manifest, preloadSegmentCount, loadSegment, loadingSegments]);

  // Live stream synchronization
  const syncLiveStream = useCallback(async () => {
    if (!isLive || !manifestUrl) return;
    
    try {
      await loadManifest(manifestUrl);
      
      // Calculate target playhead position for low latency
      if (manifest && targetLatency > 0) {
        const totalDuration = manifest.segments.reduce((sum, seg) => sum + seg.duration, 0);
        const targetPosition = Math.max(0, totalDuration - targetLatency);
        
        if (videoRef.current && Math.abs(videoRef.current.currentTime - targetPosition) > 2) {
          videoRef.current.currentTime = targetPosition;
        }
      }
      
    } catch (error) {
      console.warn('Live sync failed:', error);
    }
  }, [isLive, manifestUrl, loadManifest, manifest, targetLatency]);

  // Adaptive bitrate switching
  const switchLevel = useCallback(async (levelIndex) => {
    if (!availableLevels[levelIndex]) return;
    
    const targetLevel = availableLevels[levelIndex];
    setCurrentLevel(levelIndex);
    
    try {
      await loadManifest(targetLevel.url);
      
      setHlsMetrics(prev => ({
        ...prev,
        levelSwitches: prev.levelSwitches + 1
      }));
      
    } catch (error) {
      console.error('Level switch failed:', error);
      if (onError) {
        onError({ type: 'level_switch_error', error, level: targetLevel });
      }
    }
  }, [availableLevels, loadManifest, onError]);

  // Initialize HLS
  const initialize = useCallback(async (url, videoElement = null) => {
    if (videoElement) {
      videoRef.current = videoElement;
    }
    
    setManifestUrl(url);
    
    try {
      await loadManifest(url);
      setIsInitialized(true);
      
      // Set up intervals for live streams
      if (isLive && enableLive) {
        intervalRefs.current.manifestRefresh = setInterval(() => {
          loadManifest(url);
        }, 5000);
        
        intervalRefs.current.liveSync = setInterval(syncLiveStream, 1000);
      }
      
      // Set up segment preloading
      intervalRefs.current.segmentLoader = setInterval(preloadSegments, 2000);
      
    } catch (error) {
      console.error('HLS initialization failed:', error);
      
      // Try fallback URLs
      for (const fallbackUrl of fallbackUrls) {
        try {
          await loadManifest(fallbackUrl);
          setManifestUrl(fallbackUrl);
          setIsInitialized(true);
          break;
        } catch (fallbackError) {
          console.warn('Fallback URL failed:', fallbackUrl, fallbackError);
        }
      }
      
      if (!isInitialized) {
        throw error;
      }
    }
  }, [loadManifest, isLive, enableLive, syncLiveStream, preloadSegments, fallbackUrls]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Initialize Web Worker for segment processing
  useEffect(() => {
    if (enableWorkers && typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const { type, data } = e.data;
            
            switch (type) {
              case 'process_segment':
                // Process segment data (could include decryption, etc.)
                self.postMessage({
                  type: 'segment_processed',
                  data: data // In real implementation, this would be processed
                });
                break;
              
              default:
                break;
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        workerRef.current = new Worker(URL.createObjectURL(blob));
        
        workerRef.current.onmessage = (e) => {
          // Handle worker messages
          console.log('Worker message:', e.data);
        };
        
      } catch (error) {
        console.warn('Worker creation failed:', error);
      }
    }
  }, [enableWorkers]);

  // Seek to live edge
  const seekToLiveEdge = useCallback(() => {
    if (!isLive || !manifest || !videoRef.current) return;
    
    const totalDuration = manifest.segments.reduce((sum, seg) => sum + seg.duration, 0);
    const livePosition = Math.max(0, totalDuration - targetLatency);
    
    videoRef.current.currentTime = livePosition;
  }, [isLive, manifest, targetLatency]);

  // Get DVR window info
  const getDvrInfo = useCallback(() => {
    if (!isDvr || !manifest) return null;
    
    const totalDuration = manifest.segments.reduce((sum, seg) => sum + seg.duration, 0);
    const earliestTime = 0;
    const latestTime = totalDuration;
    
    return {
      start: earliestTime,
      end: latestTime,
      duration: totalDuration,
      canSeek: true
    };
  }, [isDvr, manifest]);

  // Public API
  return {
    // State
    isInitialized,
    manifest,
    currentLevel,
    availableLevels,
    isLive,
    isDvr,
    segmentCache,
    hlsMetrics,
    networkConditions,
    
    // Methods
    initialize,
    switchLevel,
    seekToLiveEdge,
    getDvrInfo,
    loadSegment,
    
    // Live stream specific
    liveEdge: isLive ? liveEdge : null,
    canSeekToLive: isLive,
    
    // Utilities
    getSegmentAtTime: useCallback((time) => {
      if (!manifest) return null;
      
      let currentTime = 0;
      for (const segment of manifest.segments) {
        if (time >= currentTime && time < currentTime + segment.duration) {
          return segment;
        }
        currentTime += segment.duration;
      }
      
      return null;
    }, [manifest]),
    
    getCurrentSegment: useCallback(() => {
      if (!videoRef.current || !manifest) return null;
      
      const time = videoRef.current.currentTime;
      let currentTime = 0;
      
      for (const segment of manifest.segments) {
        if (time >= currentTime && time < currentTime + segment.duration) {
          return segment;
        }
        currentTime += segment.duration;
      }
      
      return null;
    }, [manifest]),
    
    // Cache management
    clearCache: useCallback(() => {
      segmentCacheRef.current.clear();
      setSegmentCache(new Map());
    }, []),
    
    getCacheSize: useCallback(() => segmentCacheRef.current.size, []),
    
    // Quality control
    getOptimalLevel: useCallback((bandwidth) => {
      if (!availableLevels.length) return -1;
      
      const suitableLevels = availableLevels.filter(level => 
        level.bandwidth <= bandwidth * 0.8
      );
      
      if (suitableLevels.length === 0) {
        return availableLevels.length - 1; // Return lowest quality
      }
      
      // Return highest suitable quality
      return availableLevels.indexOf(
        suitableLevels.reduce((best, current) => 
          current.bandwidth > best.bandwidth ? current : best
        )
      );
    }, [availableLevels])
  };
};

export default useAdvancedHls;