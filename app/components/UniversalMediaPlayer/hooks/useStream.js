import { useState, useEffect } from 'react';

export const useStream = ({ mediaType, movieId, seasonId, episodeId, shouldFetch = true }) => {
  const [server, setServer] = useState("Vidsrc.xyz");
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamType, setStreamType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('initializing');

  useEffect(() => {
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

    let isMounted = true;
    let eventSource;

    const extractStream = async () => {
      setLoading(true);
      setError(null);
      setStreamUrl(null);
      setLoadingProgress(0);
      setLoadingPhase('initializing');

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

        const progressUrl = `/api/extract-stream-progress?${params.toString()}`;
        eventSource = new EventSource(progressUrl);

        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          const data = JSON.parse(event.data);

          if (data.progress) setLoadingProgress(data.progress);
          if (data.phase) setLoadingPhase(data.phase);

          if (data.phase === 'complete' && data.result?.success) {
            const extractData = data.result;

            if (!extractData.streamUrl) {
              setError('Stream extraction succeeded but no URL was found.');
              setLoading(false);
              eventSource.close();
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
            const needsProxy = extractData.requiresProxy || 
                              extractData.streamUrl.includes('shadowlandschronicles.com') || 
                              extractData.streamUrl.includes('cloudnestra.com') ||
                              !isVidsrc;

            let finalStreamUrl;
            if (needsProxy) {
              const sourceParam = extractData.debug?.selectedStream?.source || 
                                 (isVidsrc ? 'vidsrc' : 'embed.su');
              finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=${sourceParam}`;
              console.log(`🔄 Using proxy for ${extractData.server} URL (source: ${sourceParam})`);
            } else {
              finalStreamUrl = extractData.streamUrl;
              console.log('✅ Using direct access for stream URL');
            }

            setStreamUrl(finalStreamUrl);
            setStreamType(extractData.streamType || 'hls'); // Updated to use streamType from vm-server
            setLoading(false);
            eventSource.close();
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
            
            setError(errorMessage);
            setLoading(false);
            eventSource.close();
          }
        };

        eventSource.onerror = () => {
          if (isMounted) {
            setError('Connection to stream service failed.');
            setLoading(false);
            eventSource.close();
          }
        };

      } catch (err) {
        if (isMounted) {
          setError('Failed to initialize stream extraction.');
          setLoading(false);
        }
      }
    };

    extractStream();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [server, mediaType, movieId, seasonId, episodeId, shouldFetch]);

  return { streamUrl, streamType, loading, error, loadingProgress, loadingPhase, setServer };
}; 