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
  const extractionRef = useRef({ isExtracting: false, eventSource: null, retryTimeout: null });
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

  // Cleanup function to properly close connections and clear timeouts
  const cleanup = () => {
    if (extractionRef.current.eventSource) {
      extractionRef.current.eventSource.close();
      extractionRef.current.eventSource = null;
    }
    if (extractionRef.current.retryTimeout) {
      clearTimeout(extractionRef.current.retryTimeout);
      extractionRef.current.retryTimeout = null;
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

    console.log(`🔄 Stream extraction attempt ${attemptNumber}/${maxRetries} for:`, { mediaType, movieId, seasonId, episodeId });

    try {
      const params = new URLSearchParams({
        mediaType,
        movieId: movieId.toString(),
        server: server === "Vidsrc.xyz" ? "vidsrc.xyz" : "embed.su",
        ...(mediaType === 'tv' && { 
          seasonId: seasonId.toString(), 
          episodeId: episodeId.toString() 
        }),
      });

      // Use VM_EXTRACTION_URL for bulletproof route if available, otherwise fallback to local API
      const baseUrl = process.env.NEXT_PUBLIC_VM_EXTRACTION_URL || '/api/extract-stream-progress';
      const progressUrl = `${baseUrl}?${params.toString()}`;
      
      console.log('🔫 Using extraction endpoint:', progressUrl);
      const eventSource = new EventSource(progressUrl);
      extractionRef.current.eventSource = eventSource;

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);

          if (data.progress) setLoadingProgress(data.progress);
          if (data.phase) setLoadingPhase(data.phase);

          if (data.phase === 'complete' && data.result?.success) {
            const extractData = data.result;

            if (!extractData.streamUrl) {
              console.log(`❌ Stream extraction succeeded but no URL found on attempt ${attemptNumber}/${maxRetries}`);
              handleExtractionFailure('Stream extraction succeeded but no URL was found.', attemptNumber, data);
              return;
            }

            // Log server selection information from updated vm-server
            console.log('🎯 Stream extracted with server info:', {
              server: extractData.server,
              serverHash: extractData.serverHash,
              selectedServer: extractData.debug?.selectedStream?.source,
              extractionMethod: extractData.extractionMethod,
              requiresProxy: extractData.requiresProxy
            });

            // Process stream URL to handle CORS issues
            const isVidsrc = extractData.server === 'vidsrc.xyz' || extractData.server === 'vidsrc';
            const isShadowlands = extractData.streamType === 'shadowlands' ||
                                 extractData.streamUrl.includes('shadowlands') ||
                                 extractData.streamUrl.includes('shadowlandschronicles.com') ||
                                 extractData.streamUrl.includes('tmstr');
            const needsProxy = extractData.requiresProxy ||
                              (!isShadowlands && (extractData.streamUrl.includes('cloudnestra.com'))) ||
                              !isVidsrc;

            let finalStreamUrl;
            if (isShadowlands) {
              // NEVER use proxy for shadowlands m3u8 URLs - use direct access
              finalStreamUrl = extractData.streamUrl;
              console.log('🌑 Using direct access for shadowlands m3u8 URL (no proxy)');
            } else if (needsProxy) {
              const sourceParam = extractData.debug?.selectedStream?.source ||
                                 (isVidsrc ? 'vidsrc' : 'embed.su');
              finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=${sourceParam}`;
              console.log(`🔄 Using proxy for ${extractData.server} URL (source: ${sourceParam})`);
            } else {
              finalStreamUrl = extractData.streamUrl;
              console.log('✅ Using direct access for stream URL');
            }

            // Success - clean up and set results
            cleanup();
            setStreamUrl(finalStreamUrl);
            setStreamType(isShadowlands ? 'hls' : (extractData.streamType || 'hls'));
            setLoading(false);
            setRetryAttempt(0);
            console.log(`✅ Stream extraction succeeded on attempt ${attemptNumber}/${maxRetries}`);
            
          } else if (data.error || (data.phase === 'complete' && !data.result?.success)) {
            let errorMessage = data.message || 'Stream extraction failed';
            
            // Enhanced error messages based on server selection
            if (data.result?.debug?.suggestSwitch) {
              errorMessage += ` Try switching to ${data.result.debug.suggestSwitch}.`;
            }
            
            // Log debug information for troubleshooting
            if (data.result?.debug) {
              console.log('🔍 Stream extraction debug info:', {
                server: data.result.debug.server,
                totalFound: data.result.debug.totalFound,
                debugInfo: data.result.debug.debugInfo,
                suggestSwitch: data.result.debug.suggestSwitch
              });
            }
            
            handleExtractionFailure(errorMessage, attemptNumber, data);
          }
        } catch (parseError) {
          console.error('❌ Error parsing EventSource data:', parseError);
          handleExtractionFailure('Failed to parse server response', attemptNumber, null);
        }
      };

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

      eventSource.onerror = () => {
        if (isMountedRef.current) {
          console.log(`❌ Connection error on attempt ${attemptNumber}/${maxRetries}`);
          handleExtractionFailure('Connection to stream service failed', attemptNumber, null);
        }
      };

    } catch (err) {
      if (isMountedRef.current) {
        console.log(`❌ Initialization error on attempt ${attemptNumber}/${maxRetries}:`, err.message);
        handleExtractionFailure('Failed to initialize stream extraction', attemptNumber, null);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    // CRITICAL: Only fetch streams when explicitly requested
    if (!shouldFetch) {
      console.log('🚫 Stream fetching disabled - useStream in view-only mode');
      setLoading(false);
      return;
    }

    if (!movieId || (mediaType === 'tv' && (!seasonId || !episodeId))) {
      setLoading(false);
      return;
    }

    console.log('🚀 STARTING STREAM EXTRACTION for:', { mediaType, movieId, seasonId, episodeId });

    extractStream(1);

    return () => {
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