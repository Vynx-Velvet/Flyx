'use client'

import { useCallback, useEffect, useState } from 'react';
import { useMediaContext } from '../context/MediaContext';

/**
 * Custom hook for managing subtitles
 * @param {string} imdbId - IMDB ID for the media
 * @param {object} options - Options for subtitle fetching
 * @returns {object} Subtitle utilities and state
 */
export const useSubtitles = (imdbId, options = {}) => {
  const {
    languages = ['eng', 'spa'],
    season = null,
    episode = null,
    preferHD = true,
    includeHearingImpaired = false,
    foreignPartsOnly = false,
    autoFetch = true,
    qualityFilter = 'good' // minimum quality tier: 'basic', 'good', 'high', 'premium'
  } = options;

  const {
    fetchSubtitles,
    getCachedSubtitles,
    isSubtitleLoading
  } = useMediaContext();

  const [subtitles, setSubtitles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState({});
  const [stats, setStats] = useState({});

  // Enhanced subtitle fetching with rich options
  const fetchWithOptions = useCallback(async () => {
    if (!imdbId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchSubtitles(imdbId, {
        languages: languages.join(','),
        season,
        episode,
        preferHD,
        includeHearingImpaired,
        foreignPartsOnly
      });
      
      if (result.success) {
        setSubtitles(result);
        setRecommendations(result.recommendations || {});
        setStats(result.globalStats || {});
      } else {
        setError(result.error || 'Failed to fetch subtitles');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [imdbId, languages, season, episode, preferHD, includeHearingImpaired, foreignPartsOnly, fetchSubtitles]);

  // Auto-fetch when parameters change
  useEffect(() => {
    if (autoFetch && imdbId) {
      // Check cache first
      const cached = getCachedSubtitles(imdbId, { season, episode });
      if (cached) {
        setSubtitles(cached);
        setRecommendations(cached.recommendations || {});
        setStats(cached.globalStats || {});
      } else {
        fetchWithOptions();
      }
    }
  }, [autoFetch, imdbId, season, episode, getCachedSubtitles, fetchWithOptions]);

  // Helper functions for working with enhanced subtitle data
  const getFilteredSubtitles = useCallback((language, filters = {}) => {
    if (!subtitles?.languages?.[language]) return [];
    
    const languageData = subtitles.languages[language];
    const { grouped, subtitles: allSubs } = languageData || {};
    
    // Safety check for data structure
    if (!languageData || (!grouped && !allSubs)) {
      console.warn('Invalid subtitle data structure for language:', language, languageData);
      return [];
    }
    const {
      minQuality = qualityFilter,
      maxResults = 10,
      preferTrusted = true,
      preferHD: filterPreferHD = preferHD,
      excludeHearingImpaired = !includeHearingImpaired,
      excludeForeignOnly = !foreignPartsOnly
    } = filters;
    
    let filtered = [];
    
    // Start with quality-based filtering
    if (grouped && typeof grouped === 'object') {
      // Ensure grouped properties exist and are arrays
      const premium = Array.isArray(grouped.premium) ? grouped.premium : [];
      const high = Array.isArray(grouped.high) ? grouped.high : [];
      const good = Array.isArray(grouped.good) ? grouped.good : [];
      const basic = Array.isArray(grouped.basic) ? grouped.basic : [];
      
      if (minQuality === 'premium') filtered = [...premium];
      else if (minQuality === 'high') filtered = [...premium, ...high];
      else if (minQuality === 'good') filtered = [...premium, ...high, ...good];
      else filtered = [...premium, ...high, ...good, ...basic];
    } else {
      filtered = Array.isArray(allSubs) ? allSubs : [];
    }
    
    // Apply additional filters
    if (excludeHearingImpaired) {
      filtered = filtered.filter(sub => !sub.hearingImpaired);
    }
    
    if (excludeForeignOnly) {
      filtered = filtered.filter(sub => !sub.foreignPartsOnly);
    }
    
    if (preferTrusted) {
      // Move trusted subtitles to the front
      const trusted = filtered.filter(sub => sub.fromTrusted);
      const nonTrusted = filtered.filter(sub => !sub.fromTrusted);
      filtered = [...trusted, ...nonTrusted];
    }
    
    if (filterPreferHD) {
      // Move HD subtitles to the front
      const hd = filtered.filter(sub => sub.isHD);
      const nonHD = filtered.filter(sub => !sub.isHD);
      filtered = [...hd, ...nonHD];
    }
    
    return filtered.slice(0, maxResults);
  }, [subtitles, qualityFilter, preferHD, includeHearingImpaired, foreignPartsOnly]);

  // Get best subtitle for a language with smart selection
  const getBestSubtitle = useCallback((language, preferences = {}) => {
    const filtered = getFilteredSubtitles(language, { maxResults: 1, ...preferences });
    return filtered[0] || null;
  }, [getFilteredSubtitles]);

  // Get recommended subtitle based on type
  const getRecommendation = useCallback((language, type = 'best') => {
    return recommendations[language]?.[type] || null;
  }, [recommendations]);

  // Check if specific language/quality is available
  const hasLanguage = useCallback((language) => {
    return !!(subtitles?.languages?.[language]?.count > 0);
  }, [subtitles]);

  const hasQuality = useCallback((language, quality) => {
    return !!(subtitles?.languages?.[language]?.grouped?.[quality]?.length > 0);
  }, [subtitles]);

  // Helper functions for specific use cases
  const hasEnglish = useCallback(() => hasLanguage('eng'), [hasLanguage]);
  const hasSpanish = useCallback(() => hasLanguage('spa'), [hasLanguage]);
  
  const getEnglishSubtitle = useCallback((preferences) => getBestSubtitle('eng', preferences), [getBestSubtitle]);
  const getSpanishSubtitle = useCallback((preferences) => getBestSubtitle('spa', preferences), [getBestSubtitle]);

  // Format subtitle for video player integration
  const formatForVideoPlayer = useCallback((subtitle) => {
    if (!subtitle) return null;
    
    return {
      src: subtitle.downloadLink,
      label: `${subtitle.languageName}${subtitle.hearingImpaired ? ' (HI)' : ''}${subtitle.foreignPartsOnly ? ' (Foreign Only)' : ''}`,
      srcLang: subtitle.iso639 || subtitle.language,
      default: subtitle.language === 'eng', // Default to English
      quality: subtitle.qualityScore,
      format: subtitle.format,
      encoding: subtitle.encoding,
      metadata: {
        downloads: subtitle.downloadCount,
        rating: subtitle.rating,
        trusted: subtitle.fromTrusted,
        hd: subtitle.isHD,
        size: subtitle.size,
        releaseQuality: subtitle.releaseQuality
      }
    };
  }, []);

  // Get all subtitles formatted for video player
  const getVideoPlayerTracks = useCallback((options = {}) => {
    if (!subtitles) return [];
    
    const {
      languages: trackLanguages = languages,
      maxPerLanguage = 3,
      ...filterOptions
    } = options;
    
    const tracks = [];
    
    trackLanguages.forEach(lang => {
      const filtered = getFilteredSubtitles(lang, { 
        maxResults: maxPerLanguage, 
        ...filterOptions 
      });
      
      filtered.forEach(sub => {
        tracks.push(formatForVideoPlayer(sub));
      });
    });
    
    // Sort by quality score descending
    return tracks.sort((a, b) => (b.quality || 0) - (a.quality || 0));
  }, [subtitles, languages, getFilteredSubtitles, formatForVideoPlayer]);

  // Get quality statistics for UI display
  const getQualityBreakdown = useCallback((language) => {
    if (!subtitles?.languages?.[language]?.stats) return null;
    
    const stats = subtitles.languages[language].stats;
    const total = subtitles.languages[language].count;
    
    return {
      total,
      premium: { count: stats.premium, percentage: Math.round((stats.premium / total) * 100) },
      high: { count: stats.high, percentage: Math.round((stats.high / total) * 100) },
      good: { count: stats.good, percentage: Math.round((stats.good / total) * 100) },
      basic: { count: stats.basic, percentage: Math.round((stats.basic / total) * 100) },
      trusted: { count: stats.trusted, percentage: Math.round((stats.trusted / total) * 100) },
      hd: { count: stats.hd, percentage: Math.round((stats.hd / total) * 100) },
      hearingImpaired: { count: stats.hearingImpaired, percentage: Math.round((stats.hearingImpaired / total) * 100) },
      foreignOnly: { count: stats.foreignOnly, percentage: Math.round((stats.foreignOnly / total) * 100) }
    };
  }, [subtitles]);

  return {
    // State
    subtitles,
    loading: loading || isSubtitleLoading(imdbId, { season, episode }),
    error,
    recommendations,
    stats,
    
    // Actions
    refetch: fetchWithOptions,
    
    // Data access helpers
    getFilteredSubtitles,
    getBestSubtitle,
    getRecommendation,
    
    // Language checks
    hasLanguage,
    hasQuality,
    hasEnglish,
    hasSpanish,
    
    // Convenience getters
    getEnglishSubtitle,
    getSpanishSubtitle,
    
    // Video player integration
    formatForVideoPlayer,
    getVideoPlayerTracks,
    
    // Analytics
    getQualityBreakdown
  };
};

export default useSubtitles; 