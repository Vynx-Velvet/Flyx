'use client'

import React, { createContext, useContext, useState, useCallback } from "react";
import subtitleService from '../services/subtitleService';

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
	const [streamExtractionData, setStreamExtractionData] = useState({});

	const updateMedia = (media) => {
		console.log('Media updated:', media);
		setMediaLoaded(media);
	}

	const getMedia = () => {
		return mediaLoaded;
	};

	// Legacy VM-server subtitle processing removed - now using frontend OpenSubtitles API

	// Create blob URL from VTT content
	const createSubtitleBlobUrl = useCallback((vttContent) => {
		try {
			const blob = new Blob([vttContent], { type: 'text/vtt' });
			const blobUrl = URL.createObjectURL(blob);
			console.log('Created blob URL for VTT content:', blobUrl);
			return blobUrl;
		} catch (error) {
			console.error('Failed to create blob URL for VTT content:', error);
			return null;
		}
	}, []);

	// Clean up blob URL
	const cleanupBlobUrl = useCallback((blobUrl) => {
		if (blobUrl && blobUrl.startsWith('blob:')) {
			try {
				URL.revokeObjectURL(blobUrl);
				console.log('Cleaned up blob URL:', blobUrl);
			} catch (error) {
				console.error('Failed to cleanup blob URL:', error);
			}
		}
	}, []);

	// Get subtitle data from stream extraction cache
	const getSubtitlesFromExtraction = useCallback((cacheKey) => {
		const cached = subtitles[cacheKey];
		console.log('Getting cached subtitles for key:', cacheKey, cached);
		return cached || null;
	}, [subtitles]);

	// Check if we have subtitle data for a specific media item
	const hasSubtitleData = useCallback((mediaId, season = null, episode = null) => {
		const cacheKey = `${mediaId}_${season || 'movie'}_${episode || '0'}`;
		return !!subtitles[cacheKey];
	}, [subtitles]);

	// Get formatted subtitles for video player
	const getVideoPlayerSubtitles = useCallback((mediaId, season = null, episode = null) => {
		const cacheKey = `${mediaId}_${season || 'movie'}_${episode || '0'}`;
		const subtitleData = subtitles[cacheKey];
		
		if (!subtitleData?.subtitles) {
			return [];
		}

		return subtitleData.subtitles.map((sub, index) => {
			// Create blob URL from content if we have it and don't have a blob URL yet
			let srcUrl = sub.blobUrl;
			if (!srcUrl && sub.content) {
				srcUrl = createSubtitleBlobUrl(sub.content);
				// Store the blob URL for cleanup later
				sub.blobUrl = srcUrl;
			}

			return {
				src: srcUrl || sub.downloadLink || sub.url,
				label: `${sub.languageName}${sub.hearingImpaired ? ' (HI)' : ''}`,
				srcLang: sub.iso639 || 'en',
				default: sub.language === 'english' || sub.iso639 === 'en' || index === 0,
				kind: 'subtitles',
				format: sub.format || 'vtt',
				quality: sub.qualityScore || 85,
				content: sub.content, // Include content for direct use
				metadata: {
					language: sub.language,
					isVTT: sub.isVTT,
					contentLength: sub.contentLength,
					source: 'vm-server',
					trusted: sub.fromTrusted,
					hasContent: !!sub.content
				}
			};
		});
	}, [subtitles, createSubtitleBlobUrl]);

	// Get best subtitle for a specific language
	const getBestSubtitle = useCallback((mediaId, language = 'english', season = null, episode = null) => {
		const cacheKey = `${mediaId}_${season || 'movie'}_${episode || '0'}`;
		const subtitleData = subtitles[cacheKey];
		
		if (!subtitleData?.subtitles) {
			return null;
		}

		// Find subtitle matching the requested language
		const matchingSubtitle = subtitleData.subtitles.find(sub => 
			sub.language === language || 
			sub.languageName?.toLowerCase() === language.toLowerCase() ||
			sub.iso639 === (language === 'english' ? 'en' : language === 'spanish' ? 'es' : language)
		);

		const selectedSubtitle = matchingSubtitle || subtitleData.subtitles[0]; // Fallback to first subtitle

		// Create blob URL if we have content and don't have a blob URL yet
		if (selectedSubtitle && !selectedSubtitle.blobUrl && selectedSubtitle.content) {
			selectedSubtitle.blobUrl = createSubtitleBlobUrl(selectedSubtitle.content);
		}

		return selectedSubtitle;
	}, [subtitles, createSubtitleBlobUrl]);

	// Clear subtitle cache
	const clearSubtitleCache = useCallback(() => {
		// Clean up any blob URLs before clearing
		Object.values(subtitles).forEach(subtitleData => {
			if (subtitleData?.subtitles) {
				subtitleData.subtitles.forEach(sub => {
					if (sub.blobUrl) {
						cleanupBlobUrl(sub.blobUrl);
					}
				});
			}
		});

		setSubtitles({});
		setStreamExtractionData({});
	}, [subtitles, cleanupBlobUrl]);

	// Enhanced media fetching with IMDB ID but without OpenSubtitles integration
	const fetchDetailedMedia = useCallback(async (mediaId, type = 'movie', language = 'en-US') => {
		try {
			console.log('Fetching detailed media:', mediaId, type, language);

			const response = await fetch(`/api/tmdb?action=getDetailedMedia&movieId=${mediaId}&type=${type}&language=${language}`);
			const mediaData = await response.json();

			if (mediaData) {
				console.log('Media data fetched:', mediaData);
				updateMedia(mediaData);
				return mediaData;
			} else {
				console.warn('No media data received');
				return null;
			}
		} catch (error) {
			console.error('Error fetching detailed media:', error);
			return null;
		}
	}, []);

	// Get extraction statistics
	const getExtractionStats = useCallback((mediaId, season = null, episode = null) => {
		const cacheKey = `${mediaId}_${season || 'movie'}_${episode || '0'}`;
		const extractionData = streamExtractionData[cacheKey];
		
		if (!extractionData) return null;

		return {
			subtitlesFound: extractionData.subtitles?.found || 0,
			streamUrl: extractionData.streamUrl,
			server: extractionData.server,
			totalFound: extractionData.totalFound,
			extractionTime: extractionData.proxy?.vmResponseTime,
			debug: extractionData.debug
		};
	}, [streamExtractionData]);

	// New frontend-based subtitle methods using OpenSubtitles API
	
	// Fetch subtitles using the new subtitle service
	const fetchSubtitlesFromOpenSubtitles = useCallback(async (imdbId, languageId = 'eng', season = null, episode = null) => {
		try {
			console.log('🎬 Fetching subtitles via frontend service:', { imdbId, languageId, season, episode });
			
			const result = await subtitleService.fetchSubtitles(imdbId, languageId, season, episode);
			
			if (result.success) {
				// Store in our subtitle cache with new format
				const cacheKey = `${imdbId}_${season || 'movie'}_${episode || '0'}_${languageId}`;
				
				setSubtitles(prev => ({
					...prev,
					[cacheKey]: {
						success: true,
						subtitles: result.subtitles,
						totalCount: result.totalCount,
						language: result.language,
						source: 'opensubtitles-frontend',
						fetchedAt: Date.now(),
						languageId: languageId
					}
				}));
				
				console.log('✅ Frontend subtitles cached:', result.totalCount, 'subtitles for', result.language);
			}
			
			return result;
		} catch (error) {
			console.error('❌ Error fetching frontend subtitles:', error);
			return {
				success: false,
				error: error.message,
				subtitles: [],
				totalCount: 0
			};
		}
	}, []);

	// Download and process a specific subtitle
	const downloadAndProcessSubtitle = useCallback(async (subtitle) => {
		try {
			console.log('📥 Processing subtitle via frontend service:', subtitle.fileName);
			
			const processedSubtitle = await subtitleService.downloadSubtitle(subtitle);
			
			console.log('✅ Subtitle processed with blob URL:', processedSubtitle.blobUrl);
			return processedSubtitle;
		} catch (error) {
			console.error('❌ Error processing subtitle:', error);
			throw error;
		}
	}, []);

	// Get cached subtitles for a specific language
	const getCachedSubtitles = useCallback((imdbId, languageId = 'eng', season = null, episode = null) => {
		const cacheKey = `${imdbId}_${season || 'movie'}_${episode || '0'}_${languageId}`;
		return subtitles[cacheKey] || null;
	}, [subtitles]);

	// Fetch subtitles for multiple languages
	const fetchMultiLanguageSubtitles = useCallback(async (imdbId, languageIds = ['eng'], season = null, episode = null) => {
		try {
			console.log('🌐 Fetching multi-language subtitles:', languageIds);
			
			const promises = languageIds.map(langId => 
				fetchSubtitlesFromOpenSubtitles(imdbId, langId, season, episode)
			);
			
			const results = await Promise.allSettled(promises);
			
			const allSubtitles = [];
			const errors = [];
			
			results.forEach((result, index) => {
				if (result.status === 'fulfilled' && result.value.success) {
					allSubtitles.push(...result.value.subtitles);
				} else {
					errors.push({
						language: languageIds[index],
						error: result.reason || result.value?.error
					});
				}
			});

			// Cache combined results
			const cacheKey = `${imdbId}_${season || 'movie'}_${episode || '0'}_multi`;
			setSubtitles(prev => ({
				...prev,
				[cacheKey]: {
					success: allSubtitles.length > 0,
					subtitles: allSubtitles,
					totalCount: allSubtitles.length,
					languages: languageIds,
					source: 'opensubtitles-multi',
					fetchedAt: Date.now(),
					errors: errors
				}
			}));

			return {
				success: allSubtitles.length > 0,
				subtitles: allSubtitles,
				totalCount: allSubtitles.length,
				errors: errors,
				source: 'opensubtitles-multi'
			};

		} catch (error) {
			console.error('❌ Error fetching multi-language subtitles:', error);
			return {
				success: false,
				error: error.message,
				subtitles: [],
				totalCount: 0
			};
		}
	}, [fetchSubtitlesFromOpenSubtitles]);

	// Get best subtitle from available options
	const getBestAvailableSubtitle = useCallback((subtitles, preferredLanguage = 'English') => {
		if (!subtitles || subtitles.length === 0) return null;
		
		// Sort by quality score and preferred language
		const sorted = subtitles.sort((a, b) => {
			// Prefer the requested language
			if (a.languageName === preferredLanguage && b.languageName !== preferredLanguage) return -1;
			if (a.languageName !== preferredLanguage && b.languageName === preferredLanguage) return 1;
			
			// Prefer VTT format
			if (a.isVTT && !b.isVTT) return -1;
			if (!a.isVTT && b.isVTT) return 1;
			
			// Sort by quality score
			return b.qualityScore - a.qualityScore;
		});
		
		return sorted[0];
	}, []);
	
	return (
		<MediaContext.Provider value={{ 
			updateMedia, 
			getMedia,
			// Legacy vm-server subtitle methods (for backward compatibility)
			getSubtitlesFromExtraction,
			hasSubtitleData,
			getVideoPlayerSubtitles,
			getBestSubtitle,
			clearSubtitleCache,
			// Blob URL management for CORS-free subtitles
			createSubtitleBlobUrl,
			cleanupBlobUrl,
			// New frontend-based subtitle methods (cloudnestra approach)
			fetchSubtitlesFromOpenSubtitles,
			downloadAndProcessSubtitle,
			getCachedSubtitles,
			fetchMultiLanguageSubtitles,
			getBestAvailableSubtitle,
			// Stats and media fetching
			getExtractionStats,
			fetchDetailedMedia,
			// State
			subtitles,
			streamExtractionData
		}}>
		  {children}
		</MediaContext.Provider>
	);

}; 