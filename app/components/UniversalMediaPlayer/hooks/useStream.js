'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useStream Hook - Optimized Stream Extraction with Robust Error Handling
 * 
 * Key Improvements:
 * - Intelligent retry mechanism with exponential backoff
 * - Comprehensive error classification and recovery
 * - Optimized request handling with proper cleanup
 * - Server health checking and fallback
 * - Memory leak prevention
 * - Better progress tracking
 */
export const useStream = ({ 
  mediaType, 
  movieId, 
  seasonId, 
  episodeId, 
  shouldFetch = true,
  preferredServer = 'Vidsrc.xyz' 
}) => {
  // State management
  const [state, setState] = useState({
    server: preferredServer,
    streamUrl: null,
    streamType: null,
    loading: true,
    error: null,
    loadingProgress: 0,
    loadingPhase: 'initializing',
    retryAttempt: 0,
    serverHealth: 'unknown'
  });
  
  // Configuration
  const config = {
    maxRetries: 3,
    retryDelays: [2000, 5000, 10000], // Exponential backoff
    timeout: 45000, // Increased timeout to 45 seconds
    servers: [
      { name: 'Vidsrc.xyz', endpoint: '/api/extract-shadowlands', priority: 1 },
      { name: 'embed.su', endpoint: '/api/extract-stream-progress', priority: 2 }
    ]
  };
  
  // Refs for cleanup and tracking
  const abortControllerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentRequestRef = useRef(null);
  const extractionDebounceRef = useRef(null);
  const extractStreamRef = useRef(null);
  
  // Error classification
  const classifyError = useCallback((error, response) => {
    const errorLower = error?.toLowerCase() || '';
    
    // Non-retryable errors
    const nonRetryable = [
      'invalid tmdb id',
      'media not found',
      'invalid parameters',
      'unsupported media type',
      'authentication failed',
      'forbidden',
      'bad request'
    ];
    
    // Check if error is non-retryable
    if (nonRetryable.some(e => errorLower.includes(e))) {
      return { retryable: false, type: 'client_error' };
    }
    
    // Rate limiting
    if (errorLower.includes('rate limit') || response?.status === 429) {
      return { retryable: true, type: 'rate_limit', delay: 60000 };
    }
    
    // Server errors
    if (response?.status >= 500 || errorLower.includes('server error')) {
      return { retryable: true, type: 'server_error' };
    }
    
    // Network errors
    if (errorLower.includes('network') || errorLower.includes('timeout')) {
      return { retryable: true, type: 'network_error' };
    }
    
    // Default: retryable
    return { retryable: true, type: 'unknown' };
  }, []);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Stream hook cleanup initiated');

    // Mark component as unmounting to prevent error handling
    isMountedRef.current = false;

    if (abortControllerRef.current) {
      console.log('🛑 Aborting active request due to cleanup');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (extractionDebounceRef.current) {
      clearTimeout(extractionDebounceRef.current);
      extractionDebounceRef.current = null;
    }
    currentRequestRef.current = null;
  }, []);
  
  // Progress updater with validation
  const updateProgress = useCallback((progress, phase) => {
    if (!isMountedRef.current) return;
    
    setState(prev => ({
      ...prev,
      loadingProgress: Math.min(100, Math.max(0, progress)),
      loadingPhase: phase || prev.loadingPhase
    }));
  }, []);
  
  // Build extraction URL based on server
  const buildExtractionUrl = useCallback((server) => {
    const serverConfig = config.servers.find(s => s.name === server) || config.servers[0];
    
    if (server === 'Vidsrc.xyz') {
      const params = new URLSearchParams({
        tmdbId: movieId.toString(),
        ...(mediaType === 'tv' && {
          season: seasonId.toString(),
          episode: episodeId.toString()
        }),
      });
      return `${serverConfig.endpoint}?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        mediaType,
        movieId: movieId.toString(),
        server: 'embed.su',
        ...(mediaType === 'tv' && {
          seasonId: seasonId.toString(),
          episodeId: episodeId.toString()
        }),
      });
      const baseUrl = process.env.NEXT_PUBLIC_VM_EXTRACTION_URL || serverConfig.endpoint;
      return `${baseUrl}?${params.toString()}`;
    }
  }, [mediaType, movieId, seasonId, episodeId, config.servers]);
  
  // Process extraction response
  const processExtractionResponse = useCallback((data, server) => {
    if (!data.success || !data.streamUrl) {
      throw new Error(data.error || 'Stream extraction failed');
    }
    
    // Determine if proxy is needed
    const isShadowlands = 
      data.server === 'shadowlands' ||
      data.streamType === 'shadowlands' ||
      data.streamUrl.includes('shadowlands') ||
      data.streamUrl.includes('shadowlandschronicles.com') ||
      data.streamUrl.includes('tmstr');
    
    let finalStreamUrl;
    
    if (isShadowlands) {
      finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(data.streamUrl)}&source=vidsrc`;
      console.log('🌑 Using vidsrc.xyz proxy for shadowlands URL');
    } else if (data.requiresProxy) {
      const sourceParam = data.debug?.selectedStream?.source || server.toLowerCase();
      finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(data.streamUrl)}&source=${sourceParam}`;
      console.log(`🔄 Using proxy for ${server} URL`);
    } else {
      finalStreamUrl = data.streamUrl;
      console.log('✅ Using direct stream URL');
    }
    
    return {
      streamUrl: finalStreamUrl,
      streamType: data.streamType || 'hls',
      serverInfo: {
        server: data.server || server,
        extractionMethod: data.extractionMethod,
        chain: data.chain
      }
    };
  }, []);
  
  // Separate function for the actual extraction logic
  const performExtraction = useCallback(async (attemptNumber, server, requestId) => {
    
    // Cleanup previous attempt
    cleanup();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Update state
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      retryAttempt: attemptNumber,
      server: server || prev.server
    }));
    
    // Progress tracking
    updateProgress(10, attemptNumber > 1 ? `Retry ${attemptNumber}/${config.maxRetries}` : 'Connecting');
    
    const currentServer = server || state.server;
    console.log(`🎯 Extraction attempt ${attemptNumber}/${config.maxRetries} using ${currentServer}`);
    
    try {
      // Build URL
      const extractionUrl = buildExtractionUrl(currentServer);
      console.log('📡 Extraction URL:', extractionUrl);
      
      updateProgress(30, 'Fetching stream');
      
      // Set timeout with better error handling
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          console.log('⏰ Request timeout reached, aborting...');
          abortControllerRef.current.abort();
        }
      }, config.timeout);

      // Make request
      const response = await fetch(extractionUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);

      // Check if component was unmounted during the request
      if (!isMountedRef.current) {
        console.log('🔇 Component unmounted during request, but continuing with extraction...');
        // Don't return here - let the extraction complete even if component unmounted
        // This prevents the stream from being lost due to rapid re-mounts
      }
      
      updateProgress(60, 'Processing response');
      
      // Check response status
      if (!response.ok) {
        const errorClass = classifyError(`HTTP ${response.status}`, response);
        
        if (errorClass.retryable && attemptNumber < config.maxRetries) {
          const delay = errorClass.delay || config.retryDelays[attemptNumber - 1];
          console.log(`⏳ Retrying in ${delay}ms...`);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && extractStreamRef.current) {
              extractStreamRef.current(attemptNumber + 1, currentServer);
            }
          }, delay);
          return;
        }
        
        throw new Error(`Extraction failed: ${response.status} ${response.statusText}`);
      }
      
      // Parse response
      const data = await response.json();

      if (!isMountedRef.current) {
        console.log('🔇 Component unmounted during JSON parsing, but continuing...');
        // Continue processing even if unmounted
      }
      
      updateProgress(80, 'Finalizing');
      
      // Process extraction result
      const result = processExtractionResponse(data, currentServer);
      
      // Success!
      updateProgress(100, 'Complete');

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          streamUrl: result.streamUrl,
          streamType: result.streamType,
          loading: false,
          error: null,
          serverHealth: 'healthy',
          loadingProgress: 100,
          loadingPhase: 'complete'
        }));
      }

      console.log('✅ Stream extraction successful:', result.serverInfo);
      
    } catch (error) {
      // Always check if component is still mounted first
      if (!isMountedRef.current) {
        console.log('🔇 Component unmounted during request, ignoring error');
        return;
      }

      console.error(`❌ Extraction error on attempt ${attemptNumber}:`, error);

      // Check if we should retry
      const errorClass = classifyError(error.message, null);

      if (error.name === 'AbortError') {
        // AbortError during mounted component - this is a timeout
        if (attemptNumber < config.maxRetries) {
          console.log('⏱️ Request timeout, retrying...');
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && extractStreamRef.current) {
              extractStreamRef.current(attemptNumber + 1, currentServer);
            }
          }, config.retryDelays[attemptNumber - 1]);
          return;
        }
      } else if (errorClass.retryable && attemptNumber < config.maxRetries) {
        const delay = config.retryDelays[attemptNumber - 1];
        console.log(`🔄 Retrying in ${delay}ms (${errorClass.type})...`);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            // Try alternative server on last retry
            const nextServer = attemptNumber === config.maxRetries - 1 && currentServer === 'Vidsrc.xyz'
              ? 'embed.su'
              : currentServer;
            if (extractStreamRef.current) {
              extractStreamRef.current(attemptNumber + 1, nextServer);
            }
          }
        }, delay);
        return;
      }
      
      // Final failure
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Stream extraction failed',
        serverHealth: 'unhealthy',
        loadingProgress: 0,
        loadingPhase: 'error'
      }));
    }
  }, [
    cleanup,
    updateProgress,
    buildExtractionUrl,
    processExtractionResponse,
    classifyError,
    config.maxRetries,
    config.retryDelays,
    config.timeout,
    state.server
  ]);

  // Main extraction function
  const extractStream = useCallback(async (attemptNumber = 1, server = null) => {
    if (!isMountedRef.current) {
      console.log('🚫 Extraction cancelled - component unmounted');
      return;
    }

    // Debounce rapid successive calls
    if (extractionDebounceRef.current) {
      clearTimeout(extractionDebounceRef.current);
    }

    extractionDebounceRef.current = setTimeout(async () => {
      if (!isMountedRef.current) {
        console.log('🚫 Extraction cancelled during debounce - component unmounted');
        return;
      }

      // Prevent duplicate requests
      const requestId = Date.now();
      if (currentRequestRef.current && currentRequestRef.current > requestId - 1000) {
        console.log('🚫 Duplicate request prevented');
        return;
      }
      currentRequestRef.current = requestId;

      // Continue with the rest of the extraction logic here
      await performExtraction(attemptNumber, server, requestId);
    }, 100); // 100ms debounce
  }, [performExtraction]);

  // Update ref with current function
  extractStreamRef.current = extractStream;

  // Effect to trigger extraction
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!shouldFetch) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        streamUrl: null
      }));
      return;
    }
    
    if (!movieId || (mediaType === 'tv' && (!seasonId || !episodeId))) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Missing required parameters'
      }));
      return;
    }
    
    // Start extraction
    extractStream(1, state.server);
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [shouldFetch, movieId, mediaType, seasonId, episodeId]); // Removed extractStream from deps to prevent loops
  
  // Manual retry function
  const retryExtraction = useCallback(() => {
    if (!state.loading) {
      console.log('🔄 Manual retry triggered');
      extractStream(1, state.server);
    }
  }, [state.loading, state.server, extractStream]);
  
  // Server switch function
  const switchServer = useCallback((newServer) => {
    if (newServer !== state.server) {
      console.log(`🔀 Switching server to ${newServer}`);
      setState(prev => ({ ...prev, server: newServer }));
      extractStream(1, newServer);
    }
  }, [state.server, extractStream]);
  
  return {
    streamUrl: state.streamUrl,
    streamType: state.streamType,
    loading: state.loading,
    error: state.error,
    loadingProgress: state.loadingProgress,
    loadingPhase: state.loadingPhase,
    server: state.server,
    serverHealth: state.serverHealth,
    retryAttempt: state.retryAttempt,
    retryExtraction,
    switchServer,
    setServer: (server) => setState(prev => ({ ...prev, server }))
  };
};

export default useStream;