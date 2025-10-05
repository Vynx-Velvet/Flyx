import { useState, useEffect, useCallback, useRef } from 'react';

// Specific languages in the requested order: English, Spanish, Russian, Arabic, Italian, Portuguese, French
const REQUESTED_LANGUAGES = [
  { code: 'eng', name: 'English', flag: '🇺🇸' },
  { code: 'spa', name: 'Spanish', flag: '🇪🇸' },
  { code: 'rus', name: 'Russian', flag: '🇷🇺' },
  { code: 'ara', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ita', name: 'Italian', flag: '🇮🇹' },
  { code: 'por', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'fre', name: 'French', flag: '🇫🇷' }
];

export const useSimpleSubtitles = ({ imdbId, season, episode, videoRef, enabled = true }) => {
  const [subtitles, setSubtitles] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('rgba(0, 0, 0, 0.8)');
  const [position, setPosition] = useState('bottom');
  
  const trackRef = useRef(null);
  const blobUrlRef = useRef(null);

  // Fetch all available subtitles
  const fetchAllSubtitles = useCallback(async () => {
    if (!imdbId || !enabled) {
      console.log('🚫 Subtitle fetch skipped:', { imdbId: !!imdbId, enabled });
      return;
    }

    setLoading(true);
    setError(null);
    const allSubtitles = [];

    try {
      console.log(`🌍 Fetching subtitles for IMDB: ${imdbId}`, { season, episode });
      
      // Fetch subtitles for each requested language
      for (const lang of REQUESTED_LANGUAGES) {
        try {
          const params = new URLSearchParams({
            imdbId: imdbId,
            languageId: lang.code,
            ...(season && { season: season.toString() }),
            ...(episode && { episode: episode.toString() }),
          });

          console.log(`🔍 Fetching ${lang.name} subtitles...`);
          const response = await fetch(`/api/subtitles?${params.toString()}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.subtitles && data.subtitles.length > 0) {
              // Take the best subtitle for this language (first one, sorted by quality)
              const bestSubtitle = data.subtitles[0];
              allSubtitles.push({ 
                ...bestSubtitle, 
                language: lang.name,
                langcode: lang.code,
                flag: lang.flag,
                id: bestSubtitle.id || `${lang.code}_${Date.now()}`
              });
              console.log(`✅ Found ${lang.name} subtitles (${data.subtitles.length} available)`);
            } else {
              console.log(`❌ No ${lang.name} subtitles found`);
            }
          } else {
            console.warn(`⚠️ Failed to fetch ${lang.name} subtitles: ${response.status}`);
          }
        } catch (langError) {
          console.warn(`❌ Error fetching ${lang.name} subtitles:`, langError.message);
        }
      }

      if (allSubtitles.length > 0) {
        setSubtitles(allSubtitles);
        setAvailableLanguages(allSubtitles.map(s => ({ 
          langcode: s.langcode, 
          language: s.language,
          flag: s.flag
        })));
        console.log(`✅ Found subtitles in ${allSubtitles.length} languages:`, 
          allSubtitles.map(s => s.language).join(', '));
      } else {
        console.warn('❌ No subtitles found in any requested language');
        setSubtitles([]);
        setAvailableLanguages([]);
      }
    } catch (err) {
      setError(err.message);
      console.error("❌ Subtitle fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [imdbId, season, episode, enabled]);

  // Select and load a subtitle
  const selectSubtitle = useCallback(async (subtitle) => {
    console.log('🎬 Selecting subtitle:', subtitle?.language);
    
    if (!subtitle) {
      console.log('🔄 Clearing active subtitle');
      // Remove existing track
      if (trackRef.current && videoRef.current) {
        try {
          videoRef.current.removeChild(trackRef.current);
        } catch (e) {
          console.log('Track already removed or not found');
        }
        trackRef.current = null;
      }
      
      // Clean up blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      
      setActiveSubtitle(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 Downloading subtitle content...');
      
      const response = await fetch('/api/subtitles/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ download_link: subtitle.downloadLink }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download subtitle: ${response.status} ${errorText}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.vtt) {
        throw new Error('No VTT content in response');
      }
      
      // Clean up previous blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      
      // Create new blob URL
      const blob = new Blob([responseData.vtt], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      
      // Remove existing track if any
      if (trackRef.current && videoRef.current) {
        try {
          videoRef.current.removeChild(trackRef.current);
        } catch (e) {
          console.log('Previous track already removed');
        }
      }
      
      // Create new track element
      if (videoRef.current) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = subtitle.language;
        track.srclang = subtitle.langcode;
        track.src = blobUrl;
        track.default = true;
        
        videoRef.current.appendChild(track);
        trackRef.current = track;
        
        // Enable the track
        track.addEventListener('load', () => {
          console.log('✅ Subtitle track loaded successfully');
          if (videoRef.current.textTracks.length > 0) {
            const textTrack = videoRef.current.textTracks[0];
            textTrack.mode = subtitlesVisible ? 'showing' : 'hidden';
          }
        });
      }
      
      setActiveSubtitle({ ...subtitle, blobUrl });
      console.log('✅ Subtitle selected successfully:', subtitle.language);
      
    } catch (err) {
      setError(err.message);
      console.error("❌ Subtitle processing error:", err);
    } finally {
      setLoading(false);
    }
  }, [videoRef, subtitlesVisible]);

  // Toggle subtitle visibility
  const toggleSubtitles = useCallback(() => {
    const newVisibility = !subtitlesVisible;
    setSubtitlesVisible(newVisibility);
    
    if (videoRef.current && videoRef.current.textTracks.length > 0) {
      const textTrack = videoRef.current.textTracks[0];
      textTrack.mode = newVisibility ? 'showing' : 'hidden';
    }
    
    console.log('👁️ Subtitles visibility toggled:', newVisibility);
  }, [subtitlesVisible, videoRef]);

  // Update subtitle styling
  const updateSubtitleStyle = useCallback((styleUpdates) => {
    if (styleUpdates.fontSize !== undefined) setFontSize(styleUpdates.fontSize);
    if (styleUpdates.fontColor !== undefined) setFontColor(styleUpdates.fontColor);
    if (styleUpdates.backgroundColor !== undefined) setBackgroundColor(styleUpdates.backgroundColor);
    if (styleUpdates.position !== undefined) setPosition(styleUpdates.position);
    
    console.log('🎨 Subtitle style updated:', styleUpdates);
  }, []);

  // Initial fetch when dependencies change
  useEffect(() => {
    fetchAllSubtitles();
  }, [fetchAllSubtitles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Update track visibility when subtitlesVisible changes
  useEffect(() => {
    if (videoRef.current && videoRef.current.textTracks.length > 0) {
      const textTrack = videoRef.current.textTracks[0];
      textTrack.mode = subtitlesVisible ? 'showing' : 'hidden';
    }
  }, [subtitlesVisible, videoRef]);

  return {
    // Data
    subtitles,
    availableLanguages,
    activeSubtitle,
    loading,
    error,
    
    // Settings
    subtitlesVisible,
    fontSize,
    fontColor,
    backgroundColor,
    position,
    
    // Actions
    fetchSubtitles: fetchAllSubtitles,
    selectSubtitle,
    toggleSubtitles,
    updateSubtitleStyle,
    
    // Utilities
    hasSubtitles: subtitles.length > 0,
    isSubtitleActive: !!activeSubtitle,
  };
};