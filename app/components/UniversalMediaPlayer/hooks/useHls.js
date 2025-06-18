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
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 for Auto
  
  useEffect(() => {
    let hlsInstance = null;

    const initializeHls = async () => {
      try {
        const Hls = await loadHlsJs();
        if (!Hls || !Hls.isSupported() || !videoRef.current) {
          console.warn('HLS.js is not supported or video element is not available.');
          return;
        }

        const isDirectAccess = streamUrl && !streamUrl.startsWith('/api/');

        const hlsConfig = {
          capLevelToPlayerSize: true,
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
          const levels = data.levels.map((level, index) => ({
            id: index,
            height: level.height,
            bitrate: level.bitrate,
            label: `${level.height}p`,
          }));
          setQualities(levels);
          setCurrentQuality(hlsInstance.currentLevel); // Set initial quality
        });
        
        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentQuality(data.level);
        });

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS Fatal Error:', data);
            // We could add retry logic here
          }
        });

        setHls(hlsInstance);

      } catch (error) {
        console.error('Failed to initialize HLS player:', error);
      }
    };

    if (streamUrl && streamType === 'hls' && videoRef.current) {
      initializeHls();
    } else if (videoRef.current) {
      // For non-HLS streams, just set the src directly
      videoRef.current.src = streamUrl;
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
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
        // Clear existing subtitle tracks
        const video = videoRef.current;
        const existingTracks = video.querySelectorAll('track');
        console.log('🧹 Removing existing tracks:', existingTracks.length);
        existingTracks.forEach(track => track.remove());
        
        // Disable all text tracks
        for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = 'disabled';
            console.log('🔇 Disabled text track:', i, video.textTracks[i].label);
        }

        if (activeSubtitle?.blobUrl) {
            console.log('📝 Adding subtitle track:', activeSubtitle.language);
            
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = activeSubtitle.language;
            track.srclang = activeSubtitle.iso639 || 'en';
            track.src = activeSubtitle.blobUrl;
            track.default = true;
            
            video.appendChild(track);
            console.log('✅ Track element added to video');
            
            // Wait for track to load, then enable it
            track.addEventListener('load', () => {
                track.track.mode = 'showing';
                console.log('📺 Subtitle track loaded and enabled via load event:', activeSubtitle.language);
                console.log('🔍 Track details:', {
                    mode: track.track.mode,
                    cues: track.track.cues ? track.track.cues.length : 'no cues',
                    readyState: track.track.readyState
                });
            });
            
            track.addEventListener('error', (e) => {
                console.error('❌ Track loading error:', e);
            });
            
            // Fallback - enable immediately
            setTimeout(() => {
                if (track.track) {
                    track.track.mode = 'showing';
                    console.log('📺 Subtitle track enabled via timeout:', activeSubtitle.language);
                    console.log('🔍 Track details after timeout:', {
                        mode: track.track.mode,
                        cues: track.track.cues ? track.track.cues.length : 'no cues',
                        readyState: track.track.readyState,
                        activeCues: track.track.activeCues ? track.track.activeCues.length : 'no active cues'
                    });
                    
                    // Debug video element subtitle display
                    console.log('🎥 Video element debug:', {
                        textTracksCount: video.textTracks.length,
                        currentTime: video.currentTime,
                        duration: video.duration,
                        paused: video.paused
                    });
                }
            }, 100);
        } else {
            console.log('🔄 No active subtitle - tracks cleared');
        }
    } else {
        console.warn('⚠️ No video ref available for subtitle management');
    }
  }, [activeSubtitle, videoRef]);
  
  const setQuality = (levelId) => {
    if (hls) {
      hls.currentLevel = levelId;
      // The LEVEL_SWITCHED event will update the state
    }
  };

  return { qualities, setQuality, currentQuality, hlsInstance: hls };
}; 