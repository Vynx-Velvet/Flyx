'use client'

import React, { createContext, useContext, useState, useCallback } from "react";

const MediaContext = createContext();

export const useMediaContext = () => {
  const context = useContext(MediaContext);
  if (!context) {
    return {};
  }
  return context;
};

export const MediaProvider = ({ children }) => {
	const [mediaLoaded, setMediaLoaded] = useState();
	const [subtitles, setSubtitles] = useState({});
	const [subtitleLoading, setSubtitleLoading] = useState({});

	const updateMedia = (media) => {
		console.log('Media updated:', media);
		setMediaLoaded(media);
	}

	const getMedia = () => {
		return mediaLoaded;
	};

	// Fetch subtitles for a given IMDB ID
	const fetchSubtitles = useCallback(async (imdbId, options = {}) => {
		if (!imdbId) {
			console.warn('No IMDB ID provided for subtitle fetching');
			return null;
		}

		const {
			languages = 'eng,spa', // Default to English and Spanish
			season = null,
			episode = null,
			forceRefresh = false
		} = options;

		// Create cache key
		const cacheKey = `${imdbId}_${season || 'movie'}_${episode || '0'}_${languages}`;

		// Return cached subtitles if available and not forcing refresh
		if (!forceRefresh && subtitles[cacheKey]) {
			console.log('Returning cached subtitles for:', cacheKey);
			return subtitles[cacheKey];
		}

		// Prevent duplicate requests
		if (subtitleLoading[cacheKey]) {
			console.log('Subtitle request already in progress for:', cacheKey);
			return null;
		}

		setSubtitleLoading(prev => ({ ...prev, [cacheKey]: true }));

		try {
			console.log('Fetching subtitles for IMDB ID:', imdbId, 'Languages:', languages);

			// Build subtitle API URL
			let subtitleUrl = `/api/subtitles?imdbId=${imdbId}&languages=${languages}`;
			if (season && episode) {
				subtitleUrl += `&season=${season}&episode=${episode}`;
			}

			const response = await fetch(subtitleUrl);
			const data = await response.json();

			if (data.success) {
				console.log('Subtitles fetched successfully:', data);
				
				// Cache the results
				setSubtitles(prev => ({
					...prev,
					[cacheKey]: data
				}));

				setSubtitleLoading(prev => ({ ...prev, [cacheKey]: false }));
				return data;
			} else {
				console.error('Subtitle API error:', data.error);
				setSubtitleLoading(prev => ({ ...prev, [cacheKey]: false }));
				return null;
			}
		} catch (error) {
			console.error('Error fetching subtitles:', error);
			setSubtitleLoading(prev => ({ ...prev, [cacheKey]: false }));
			return null;
		}
	}, [subtitles, subtitleLoading]);

	// Get cached subtitles
	const getCachedSubtitles = useCallback((imdbId, season = null, episode = null, languages = 'eng,spa') => {
		const cacheKey = `${imdbId}_${season || 'movie'}_${episode || '0'}_${languages}`;
		return subtitles[cacheKey] || null;
	}, [subtitles]);

	// Check if subtitles are loading
	const isSubtitleLoading = useCallback((imdbId, season = null, episode = null, languages = 'eng,spa') => {
		const cacheKey = `${imdbId}_${season || 'movie'}_${episode || '0'}_${languages}`;
		return subtitleLoading[cacheKey] || false;
	}, [subtitleLoading]);

	// Clear subtitle cache
	const clearSubtitleCache = useCallback(() => {
		setSubtitles({});
		setSubtitleLoading({});
	}, []);

	// Enhanced media fetching with IMDB ID and subtitle integration
	const fetchDetailedMedia = useCallback(async (mediaId, type = 'movie', language = 'en-US') => {
		try {
			console.log('Fetching detailed media:', mediaId, type, language);

			const response = await fetch(`/api/tmdb?action=getDetailedMedia&movieId=${mediaId}&type=${type}&language=${language}`);
			const mediaData = await response.json();

			if (mediaData && mediaData.imdb_id) {
				console.log('Media data with IMDB ID:', mediaData);
				
				// Update media context
				updateMedia(mediaData);

				// Pre-fetch subtitles if IMDB ID is available
				if (mediaData.imdb_id) {
					// Use available languages from translations, fallback to common languages
					const preferredLanguages = mediaData.subtitle_ready?.preferred_languages?.join(',') || 'eng,spa';
					
					// Fetch subtitles in background (don't await to avoid blocking)
					fetchSubtitles(mediaData.imdb_id, { 
						languages: preferredLanguages 
					}).catch(err => console.warn('Background subtitle fetch failed:', err));
				}

				return mediaData;
			} else {
				console.warn('No IMDB ID found in media data');
				updateMedia(mediaData);
				return mediaData;
			}
		} catch (error) {
			console.error('Error fetching detailed media:', error);
			return null;
		}
	}, [fetchSubtitles]);
	
	return (
		<MediaContext.Provider value={{ 
			updateMedia, 
			getMedia,
			fetchSubtitles,
			getCachedSubtitles,
			isSubtitleLoading,
			clearSubtitleCache,
			fetchDetailedMedia,
			subtitles,
			subtitleLoading
		}}>
		  {children}
		</MediaContext.Provider>
	);

}; 