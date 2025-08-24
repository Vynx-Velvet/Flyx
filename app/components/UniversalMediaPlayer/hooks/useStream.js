import { useState, useEffect, useRef } from 'react';

export const useStream = ({ mediaType, movieId, seasonId, episodeId, shouldFetch = true }) => {
  const [server, setServer] = useState("Vidsrc.xyz");
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamType, setStreamType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('initializing');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [maxRetries] = useState(3);
  
  // Use refs to track extraction state and prevent race conditions
  const extractionRef = useRef({ isExtracting: false, retryTimeout: null, abortController: null });
  const isMountedRef = useRef(true);

  // Helper function to determine if an error is retryable
  const isRetryableError = (errorMessage, data) => {
    const nonRetryableErrors = [
      'invalid tmdb id',
      'media not found',
      'invalid parameters',
      'unsupported media type',
      'rate limited',
      'blocked by provider'
    ];
    
    const errorLower = errorMessage.toLowerCase();
    return !nonRetryableErrors.some(nonRetryable => errorLower.includes(nonRetryable));
  };

  // Cleanup function to properly clear timeouts and abort requests
  const cleanup = () => {
    if (extractionRef.current.retryTimeout) {
      clearTimeout(extractionRef.current.retryTimeout);
      extractionRef.current.retryTimeout = null;
    }
    if (extractionRef.current.abortController) {
      extractionRef.current.abortController.abort();
      extractionRef.current.abortController = null;
    }
    extractionRef.current.isExtracting = false;
  };

  // Extract stream function with proper retry logic
  const extractStream = async (attemptNumber = 1) => {
    // Prevent multiple simultaneous extraction attempts
    if (extractionRef.current.isExtracting && attemptNumber === 1) {
      console.log('🚫 Extraction already in progress, skipping duplicate request');
      return;
    }

    // Clean up any existing connections
    cleanup();
    
    if (!isMountedRef.current) {
      console.log('🚫 Component unmounted, aborting extraction');
      return;
    }

    extractionRef.current.isExtracting = true;
    
    setLoading(true);
    setError(null);
    setStreamUrl(null);
    setLoadingProgress(0);
    setLoadingPhase(attemptNumber > 1 ? `retrying (attempt ${attemptNumber}/${maxRetries})` : 'initializing');
    setRetryAttempt(attemptNumber);

    console.log(`🔄 Stream extraction attempt ${attemptNumber}/${maxRetries} for:`, { server, mediaType, movieId, seasonId, episodeId });

    // Handle extraction failure with retry logic
    const handleExtractionFailure = (errorMessage, attemptNumber, data) => {
      console.log(`❌ Stream extraction failed on attempt ${attemptNumber}/${maxRetries}:`, errorMessage);
      
      // Check if this error should trigger a retry
      const shouldRetry = isRetryableError(errorMessage, data) && attemptNumber < maxRetries;
      
      if (shouldRetry) {
        console.log(`🔄 Retrying stream extraction in 5 seconds... (attempt ${attemptNumber + 1}/${maxRetries})`);
        cleanup();
        
        // Use longer delay between retries to avoid overwhelming the server
        extractionRef.current.retryTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            extractStream(attemptNumber + 1);
          }
        }, 5000); // Increased to 5 seconds
      } else {
        // All retries exhausted or non-retryable error
        cleanup();
        const finalMessage = attemptNumber >= maxRetries
          ? `${errorMessage} (Failed after ${maxRetries} attempts)`
          : errorMessage;
        
        console.log(attemptNumber >= maxRetries ? `💥 All ${maxRetries} extraction attempts failed` : '🚫 Non-retryable error encountered');
        setError(finalMessage);
        setLoading(false);
        setRetryAttempt(0);
      }
    };

    try {
      let extractionUrl;
      let params;
      
      // Use new extract-shadowlands API for Vidsrc.xyz
      if (server === "Vidsrc.xyz") {
        console.log('🎯 Using new extract-shadowlands API (direct HTTP method)');
        
        params = new URLSearchParams({
          tmdbId: movieId.toString(),
          ...(mediaType === 'tv' && {
            season: seasonId.toString(),
            episode: episodeId.toString()
          }),
        });
        
        extractionUrl = `/api/extract-shadowlands?${params.toString()}`;
      } else {
        // Use original extraction for other servers
        params = new URLSearchParams({
          mediaType,
          movieId: movieId.toString(),
          server: "embed.su",
          ...(mediaType === 'tv' && {
            seasonId: seasonId.toString(),
            episodeId: episodeId.toString()
          }),
        });

        // Use VM_EXTRACTION_URL for bulletproof route if available, otherwise fallback to local API
        const baseUrl = process.env.NEXT_PUBLIC_VM_EXTRACTION_URL || '/api/extract-stream-progress';
        extractionUrl = `${baseUrl}?${params.toString()}`;
      }
      
      console.log('🔫 Using extraction endpoint:', extractionUrl);
      
      // Update progress to show we're starting
      setLoadingProgress(10);
      setLoadingPhase('connecting');

      // Create abort controller for this request
      extractionRef.current.abortController = new AbortController();
      
      // Make direct HTTP request (no EventSource)
      const response = await fetch(extractionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        // Use abort controller signal
        signal: extractionRef.current.abortController.signal
      });

      if (!isMountedRef.current) return;

      // Update progress to show we're processing
      setLoadingProgress(50);
      setLoadingPhase('processing');

      if (!response.ok) {
        console.log(`❌ HTTP extraction failed with status ${response.status} on attempt ${attemptNumber}/${maxRetries}`);
        handleExtractionFailure(`Extraction service error: ${response.status} ${response.statusText}`, attemptNumber, null);
        return;
      }

      const extractData = await response.json();
      
      if (!isMountedRef.current) return;

      // Update progress to show we're finalizing
      setLoadingProgress(90);
      setLoadingPhase('finalizing');

      console.log('🎯 Extraction response received:', {
        success: extractData.success,
        hasStreamUrl: !!extractData.streamUrl,
        server: extractData.server,
        extractionMethod: extractData.extractionMethod,
        requiresProxy: extractData.requiresProxy,
        ...(extractData.chain && { chain: extractData.chain })
      });

      if (extractData.success && extractData.streamUrl) {
        // Log server selection information
        console.log('🎯 Stream extracted with server info:', {
          server: extractData.server || server,
          serverHash: extractData.serverHash,
          selectedServer: extractData.debug?.selectedStream?.source,
          extractionMethod: extractData.extractionMethod,
          requiresProxy: extractData.requiresProxy
        });

        // Check if URL is from shadowlands
        const isShadowlands = extractData.server === 'shadowlands' ||
                             extractData.streamType === 'shadowlands' ||
                             extractData.streamUrl.includes('shadowlands') ||
                             extractData.streamUrl.includes('shadowlandschronicles.com') ||
                             extractData.streamUrl.includes('tmstr');

        let finalStreamUrl;
        
        if (isShadowlands) {
          // Shadowlands URLs use vidsrc.xyz proxy method (origin and referer only)
          finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=vidsrc`;
          console.log('🌑 Using vidsrc.xyz proxy method for shadowlands URL (origin and referer headers only)');
          
          // Log the extraction chain if available
          if (extractData.chain) {
            console.log('📊 Extraction chain:', {
              vidsrc: extractData.chain.vidsrc,
              cloudnestra: extractData.chain.cloudnestra,
              prorcp: extractData.chain.prorcp,
              shadowlands: extractData.chain.shadowlands
            });
          }
        } else {
          // Check if other URLs need proxy
          const isVidsrc = server === 'Vidsrc.xyz' || extractData.server === 'vidsrc.xyz' || extractData.server === 'vidsrc';
          const needsProxy = extractData.requiresProxy ||
                            extractData.streamUrl.includes('cloudnestra.com') ||
                            !isVidsrc;

          if (needsProxy) {
            const sourceParam = extractData.debug?.selectedStream?.source ||
                               (isVidsrc ? 'vidsrc' : 'embed.su');
            finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=${sourceParam}`;
            console.log(`🔄 Using proxy for ${extractData.server || server} URL (source: ${sourceParam})`);
          } else {
            finalStreamUrl = extractData.streamUrl;
            console.log('✅ Using direct access for stream URL');
          }
        }

        // Success - clean up and set results
        cleanup();
        setStreamUrl(finalStreamUrl);
        setStreamType(isShadowlands ? 'hls' : (extractData.streamType || 'hls'));
        setLoadingProgress(100);
        setLoadingPhase('complete');
        setLoading(false);
        setRetryAttempt(0);
        console.log(`✅ Stream extraction succeeded on attempt ${attemptNumber}/${maxRetries}`);
        
      } else {
        console.log(`❌ Stream extraction succeeded but no URL found on attempt ${attemptNumber}/${maxRetries}`);
        let errorMessage = extractData.error || 'Stream extraction succeeded but no URL was found.';
        
        // Enhanced error messages based on server selection
        if (extractData.debug?.suggestSwitch) {
          errorMessage += ` Try switching to ${extractData.debug.suggestSwitch}.`;
        }
        
        // Log debug information for troubleshooting
        if (extractData.debug || extractData.metadata) {
          console.log('🔍 Stream extraction debug info:', {
            server: extractData.debug?.server || extractData.server,
            totalFound: extractData.debug?.totalFound,
            debugInfo: extractData.debug?.debugInfo,
            suggestSwitch: extractData.debug?.suggestSwitch,
            metadata: extractData.metadata
          });
        }
        
        handleExtractionFailure(errorMessage, attemptNumber, extractData);
      }


    } catch (err) {
      if (isMountedRef.current) {
        console.log(`❌ HTTP request error on attempt ${attemptNumber}/${maxRetries}:`, err.message);
        
        let errorMessage = 'Failed to connect to extraction service';
        if (err.name === 'AbortError') {
          errorMessage = 'Request timeout - extraction took too long';
        } else if (err.name === 'TypeError') {
          errorMessage = 'Network error - unable to reach extraction service';
        }
        
        handleExtractionFailure(errorMessage, attemptNumber, null);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    // CRITICAL: Immediately cleanup and abort if shouldFetch is false
    if (!shouldFetch) {
      console.log('🚫 Stream fetching disabled - cleanup and abort all requests');
      cleanup();
      setLoading(false);
      setError(null);
      setStreamUrl(null);
      return;
    }

    if (!movieId || (mediaType === 'tv' && (!seasonId || !episodeId))) {
      cleanup();
      setLoading(false);
      return;
    }

    console.log('🚀 STARTING STREAM EXTRACTION for:', { server, mediaType, movieId, seasonId, episodeId });

    extractStream(1);

    return () => {
      console.log('🧹 useStream cleanup: aborting all requests and clearing timeouts');
      isMountedRef.current = false;
      cleanup();
    };
  }, [server, mediaType, movieId, seasonId, episodeId, shouldFetch]);

  // Manual retry function for external use
  const retryExtraction = () => {
    if (!extractionRef.current.isExtracting) {
      console.log('🔄 Manual retry triggered');
      extractStream(1);
    } else {
      console.log('🚫 Extraction already in progress, ignoring manual retry');
    }
  };

  return { 
    streamUrl, 
    streamType, 
    loading, 
    error, 
    loadingProgress, 
    loadingPhase, 
    setServer, 
    retryAttempt, 
    maxRetries,
    retryExtraction 
  };
};