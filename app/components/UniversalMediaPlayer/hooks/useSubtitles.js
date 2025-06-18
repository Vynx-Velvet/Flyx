import { useState, useEffect, useCallback } from 'react';

// Specific languages in the requested order: English, Spanish, Russian, Arabic, Italian, Portuguese, French
const REQUESTED_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'rus', name: 'Russian' },
  { code: 'ara', name: 'Arabic' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'fre', name: 'French' }
];

// This new hook will be self-contained and not rely on MediaContext.
export const useSubtitles = ({ imdbId, season, episode, enabled }) => {
  const [subtitles, setSubtitles] = useState([]);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllSubtitles = useCallback(async () => {
    if (!imdbId || !enabled) return;

    setLoading(true);
    setError(null);
    const allSubtitles = [];

    try {
      console.log(`🌍 Fetching subtitles for requested languages for IMDB: ${imdbId}`);
      
      // Fetch subtitles for each requested language in order
      for (const lang of REQUESTED_LANGUAGES) {
        try {
          const params = new URLSearchParams({
            imdbId: imdbId,
            languageId: lang.code,
            ...(season && { season: season }),
            ...(episode && { episode: episode }),
          });

          const response = await fetch(`/api/subtitles?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.subtitles && data.subtitles.length > 0) {
              // Take the best subtitle for this language (first one, as they're sorted by quality)
              const bestSubtitle = data.subtitles[0];
              allSubtitles.push({ 
                ...bestSubtitle, 
                language: lang.name, // Use our clean language name
                langcode: lang.code,
                id: bestSubtitle.id || `${lang.code}_${Math.random()}`
              });
              console.log(`✅ Found ${lang.name} subtitles`);
            } else {
              console.log(`❌ No ${lang.name} subtitles found`);
            }
          }
        } catch (langError) {
          console.warn(`❌ Failed to fetch ${lang.name} subtitles:`, langError);
        }
      }

      if (allSubtitles.length > 0) {
        console.log('🔥 SETTING SUBTITLES STATE:', {
          subtitlesCount: allSubtitles.length,
          subtitles: allSubtitles.map(s => ({
            id: s.id,
            language: s.language,
            downloadLink: s.downloadLink,
            langcode: s.langcode
          }))
        });
        setSubtitles(allSubtitles);
        setAvailableLanguages(allSubtitles.map(s => ({ 
          langcode: s.langcode, 
          language: s.language 
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

  // Initial fetch
  useEffect(() => {
    fetchAllSubtitles();
  }, [fetchAllSubtitles]);
  
  const selectSubtitle = useCallback(async (subtitle) => {
    console.log('🎬 selectSubtitle called with:', subtitle?.language, subtitle?.id, subtitle);
    
    if (!subtitle) {
        console.log('🔄 Clearing active subtitle');
        setActiveSubtitle(null);
        return;
    }
    
    setLoading(true);
    try {
        console.log('📥 Downloading subtitle:', subtitle.downloadLink);
        console.log('📋 Full subtitle object:', subtitle);
        
        const response = await fetch('/api/subtitles/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ download_link: subtitle.downloadLink }),
        });
        
        console.log('📡 Download response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Download response error:', errorText);
            throw new Error(`Failed to download subtitle content: ${response.status} ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('📄 Download response data:', responseData);
        
        if (!responseData.vtt) {
            throw new Error('No VTT content in response');
        }
        
        const blob = new Blob([responseData.vtt], { type: 'text/vtt' });
        const blobUrl = URL.createObjectURL(blob);

        // Revoke old blob URL if it exists
        if (activeSubtitle?.blobUrl) {
            console.log('🗑️ Revoking old blob URL:', activeSubtitle.blobUrl);
            URL.revokeObjectURL(activeSubtitle.blobUrl);
        }

        const newActiveSubtitle = { ...subtitle, blobUrl };
        setActiveSubtitle(newActiveSubtitle);
        console.log('✅ Subtitle selected and processed successfully:', subtitle.language, 'ID:', subtitle.id);
        console.log('🔗 Blob URL created:', blobUrl);
    } catch (err) {
        setError(err.message);
        console.error("❌ Subtitle processing error:", err);
    } finally {
        setLoading(false);
    }
  }, [activeSubtitle]);

  return {
    subtitles,
    availableLanguages,
    activeSubtitle,
    loading,
    error,
    fetchSubtitles: fetchAllSubtitles,
    selectSubtitle,
  };
};
