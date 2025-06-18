import { useState, useEffect } from 'react';

export const useStream = ({ mediaType, movieId, seasonId, episodeId }) => {
  const [server, setServer] = useState("Vidsrc.xyz");
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamType, setStreamType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('initializing');

  useEffect(() => {
    if (!movieId || (mediaType === 'tv' && (!seasonId || !episodeId))) {
      setLoading(false);
      return;
    }

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

            // Process stream URL to handle CORS issues
            const isVidsrc = extractData.server === 'vidsrc.xyz';
            // Some vidsrc URLs need to be proxied
            const needsProxy = extractData.streamUrl.includes('shadowlandschronicles.com') || !isVidsrc;

            let finalStreamUrl;
            if (needsProxy) {
              finalStreamUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=${isVidsrc ? 'vidsrc' : 'embed.su'}`;
              console.log(`Using proxy for ${extractData.server} URL.`);
            } else {
              finalStreamUrl = extractData.streamUrl;
              console.log('Using direct access for vidsrc.xyz URL');
            }

            setStreamUrl(finalStreamUrl);
            setStreamType(extractData.type || (extractData.streamUrl.includes('.m3u8') ? 'hls' : 'mp4'));
            setLoading(false);
            eventSource.close();
          } else if (data.error || (data.phase === 'complete' && !data.result?.success)) {
            setError(data.message || 'Stream extraction failed');
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
  }, [server, mediaType, movieId, seasonId, episodeId]);

  return { streamUrl, streamType, loading, error, loadingProgress, loadingPhase, setServer };
}; 