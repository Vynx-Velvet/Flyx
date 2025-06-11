import { NextResponse } from 'next/server';

// Helper function to filter out unreleased content
const filterReleasedContent = (items) => {
	const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
	
	return items.filter(item => {
		const releaseDate = item.release_date || item.first_air_date;
		return releaseDate && releaseDate <= today;
	});
};

const tmdbOptions = {
	method: 'GET',
	headers: {
		accept: 'application/json',
		Authorization:
			'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiODlhY2RkODdlMTJjMjgzZjU2ZmViMmUwMTZiNDk2NCIsIm5iZiI6MTcxOTg4MzU2OS40NDU1MDcsInN1YiI6IjY2ODE5MzQ5NjhlOTgzNmRjZWRkNDM3NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bETg1ujNoewklg0L0Q3hOZuqnaB9v7V4XzenHmlLYso',
	},
};

const animeOptions = {
	method: 'GET',
	headers: {
		accept: 'application/json',
	},
};

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const action = searchParams.get('action');
	const movieId = searchParams.get('movieId');
	const seasonId = searchParams.get('seasonId');
	const pageNumber = searchParams.get('pageNumber');
	const category = searchParams.get('category');
	const filter = searchParams.get('filter');
	const query = searchParams.get('query');

	try {
		switch (action) {
			case 'getShowDetails':
				const response = await fetch(`https://api.themoviedb.org/3/tv/${movieId}?language=en-US`, tmdbOptions);
				const showData = await response.json();
				
				// Fetch external IDs (including IMDB ID) for the show
				const externalIdsResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/external_ids`, tmdbOptions);
				const externalIds = await externalIdsResponse.json();
				
				// Add external IDs to the response
				const enrichedShowData = {
					...showData,
					external_ids: externalIds,
					imdb_id: externalIds.imdb_id
				};
				
				return NextResponse.json(enrichedShowData);

			case 'getMovieDetails':
				const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US`, tmdbOptions);
				const movieData = await movieResponse.json();
				
				// Fetch external IDs (including IMDB ID) for the movie
				const movieExternalIdsResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/external_ids`, tmdbOptions);
				const movieExternalIds = await movieExternalIdsResponse.json();
				
				// Add external IDs to the response
				const enrichedMovieData = {
					...movieData,
					external_ids: movieExternalIds,
					imdb_id: movieExternalIds.imdb_id
				};
				
				return NextResponse.json(enrichedMovieData);

			case 'getSeasonDetails':
				const seasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/season/${seasonId}?language=en-US`, tmdbOptions);
				const seasonData = await seasonResponse.json();
				
				// Fetch external IDs for the parent TV show to get IMDB ID
				const showExternalIdsResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/external_ids`, tmdbOptions);
				const showExternalIds = await showExternalIdsResponse.json();
				
				// Add show's external IDs to season data for subtitle fetching
				const enrichedSeasonData = {
					...seasonData,
					show_external_ids: showExternalIds,
					show_imdb_id: showExternalIds.imdb_id,
					// Add subtitle helper for episodes
					episodes: seasonData.episodes?.map(episode => ({
						...episode,
						subtitle_ready: {
							imdb_id: showExternalIds.imdb_id,
							season: seasonId,
							episode: episode.episode_number,
							type: 'tv'
						}
					})) || []
				};
				
				return NextResponse.json(enrichedSeasonData);

			case 'getIMDBtv':
				const externalIdsTvResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/external_ids`, tmdbOptions);
				const externalIdsData = await externalIdsTvResponse.json();
				const externalData = externalIdsData.imdb_id;
				return NextResponse.json({ externalData });

			case 'getTranslations':
				const mediaType = searchParams.get('mediaType') || 'movie'; // movie or tv
				const translationsResponse = await fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}/translations`, tmdbOptions);
				const translationsData = await translationsResponse.json();
				return NextResponse.json(translationsData);

			case 'getDetailedMedia':
				const type = searchParams.get('type') || 'movie'; // movie or tv
				const language = searchParams.get('language') || 'en-US';
				
				// Fetch main details
				const detailsResponse = await fetch(`https://api.themoviedb.org/3/${type}/${movieId}?language=${language}`, tmdbOptions);
				const detailsData = await detailsResponse.json();
				
				// Fetch external IDs (including IMDB ID)
				const extIdsResponse = await fetch(`https://api.themoviedb.org/3/${type}/${movieId}/external_ids`, tmdbOptions);
				const extIds = await extIdsResponse.json();
				
				// Fetch translations for subtitle language detection
				const transResponse = await fetch(`https://api.themoviedb.org/3/${type}/${movieId}/translations`, tmdbOptions);
				const translations = await transResponse.json();
				
				// Build comprehensive response with subtitle-ready data
				const detailedMedia = {
					...detailsData,
					external_ids: extIds,
					imdb_id: extIds.imdb_id,
					translations: translations,
					subtitle_ready: {
						imdb_id: extIds.imdb_id,
						type: type,
						available_languages: translations.translations?.map(t => t.iso_639_1).filter(Boolean) || [],
						preferred_languages: ['en', 'es', 'fr', 'de', 'it'] // Most common subtitle languages
					}
				};
				
				return NextResponse.json(detailedMedia);

			case 'getTrendingNow':
				const trendingMoviesDailyResponse = await fetch(`https://api.themoviedb.org/3/trending/movie/day?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingShowsDailyResponse = await fetch(`https://api.themoviedb.org/3/trending/tv/day?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingMoviesDailyData = await trendingMoviesDailyResponse.json();
				const trendingShowsDailyData = await trendingShowsDailyResponse.json();
				
				// Add media_type to each item, filter released content, and combine results
				const moviesWithType = filterReleasedContent(trendingMoviesDailyData.results || []).map(movie => ({
					...movie,
					media_type: "movie"
				}));
				
				const showsWithType = filterReleasedContent(trendingShowsDailyData.results || []).map(show => ({
					...show,
					media_type: "tv"
				}));
				
				// Combine the results (interleaved for variety but consistent)
				const combinedResults = [];
				const maxLength = Math.max(moviesWithType.length, showsWithType.length);
				for (let i = 0; i < maxLength && combinedResults.length < 20; i++) {
					if (i < moviesWithType.length) combinedResults.push(moviesWithType[i]);
					if (i < showsWithType.length && combinedResults.length < 20) combinedResults.push(showsWithType[i]);
				}
				
				return NextResponse.json({
					...trendingMoviesDailyData,
					results: combinedResults
				});

			case 'getTrendingWeekly':
				const trendingMoviesWeeklyResponse = await fetch(`https://api.themoviedb.org/3/trending/movie/week?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingShowsWeeklyResponse = await fetch(`https://api.themoviedb.org/3/trending/tv/week?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingMoviesWeeklyData = await trendingMoviesWeeklyResponse.json();
				const trendingShowsWeeklyData = await trendingShowsWeeklyResponse.json();
				
				// Add media_type to each item, filter released content, and combine results
				const moviesWithTypeWeekly = filterReleasedContent(trendingMoviesWeeklyData.results || []).map(movie => ({
					...movie,
					media_type: "movie"
				}));
				
				const showsWithTypeWeekly = filterReleasedContent(trendingShowsWeeklyData.results || []).map(show => ({
					...show,
					media_type: "tv"
				}));
				
				// Combine the results (interleaved for variety but consistent)
				const combinedWeeklyResults = [];
				const maxLengthWeekly = Math.max(moviesWithTypeWeekly.length, showsWithTypeWeekly.length);
				for (let i = 0; i < maxLengthWeekly && combinedWeeklyResults.length < 20; i++) {
					if (i < moviesWithTypeWeekly.length) combinedWeeklyResults.push(moviesWithTypeWeekly[i]);
					if (i < showsWithTypeWeekly.length && combinedWeeklyResults.length < 20) combinedWeeklyResults.push(showsWithTypeWeekly[i]);
				}
				
				return NextResponse.json({
					...trendingMoviesWeeklyData,
					results: combinedWeeklyResults
				});

			case 'getPopularAnime':
				const popularAnimeResponse = await fetch(
					'https://api.themoviedb.org/3/discover/tv?first_air_date.gte=2024-01-01&include_adult=false&include_null_first_air_dates=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=16&with_origin_country=JP',
					tmdbOptions
				);
				const popularAnimeResponseData = await popularAnimeResponse.json();

				// Filter released content and add media_type
				const correctedAnimeResponseData = filterReleasedContent(popularAnimeResponseData.results || []).map((anime) => {
					return {
						...anime,
						media_type: "tv", // Add media_type to each item
					};
				});

				// Return the modified results along with other possible metadata (if needed)
				return NextResponse.json({
					...popularAnimeResponseData, // Keep metadata like total_pages, etc.
					results: correctedAnimeResponseData, // Replace results with the corrected array
				});

			case "search":
				if (!query) {
					return NextResponse.json({ error: "Missing required query parameter for search" }, { status: 400 });
				}
				try {
					const searchResponse = await fetch(
						`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
							query
						)}&language=en-US&page=${pageNumber ? pageNumber : 1}&include_adult=false`,
						tmdbOptions
					);
					const searchData = await searchResponse.json();

					// Filter released content and ensure consistent structure
					const correctedSearchResults = filterReleasedContent(searchData.results || []).map((result) => {
						return {
							...result,
							media_type: result.media_type || "unknown", // Ensure media_type is always present
						};
					});

					return NextResponse.json({
						...searchData,
						results: correctedSearchResults,
					});
				} catch (error) {
					console.error("Error during search:", error);
					return NextResponse.json({ error: "Error fetching search results" }, { status: 500 });
				}

			case "searchAnime":
				if (!query) {
					return NextResponse.json({ error: "Missing required query parameter for search" }, { status: 400 });
				}
				try {
					const searchResponse = await fetch(
						`https://animeapi.skin/search?q=${encodeURIComponent(
							query
						)}&page=${pageNumber ? pageNumber : 1}`,
						animeOptions
					);
					const searchData = await searchResponse.json();

					return NextResponse.json({
						results: [...searchData]
					});
				} catch (error) {
					console.error("Error during search:", error);
					return NextResponse.json({ error: "Error fetching search results" }, { status: 500 });
				}

			case 'getTopRatedMovies':
				const topRatedMoviesResponse = await fetch(`https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const topRatedMoviesData = await topRatedMoviesResponse.json();
				
				// Filter out unreleased movies
				const filteredTopRatedMovies = filterReleasedContent(topRatedMoviesData.results || []);
				
				return NextResponse.json({
					...topRatedMoviesData,
					results: filteredTopRatedMovies
				});

			case 'getUpcomingMovies':
				const upcomingMoviesResponse = await fetch(`https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const upcomingMoviesData = await upcomingMoviesResponse.json();
				return NextResponse.json(upcomingMoviesData);

			case 'getAiringTodayShows':
				const airingTodayShowsResponse = await fetch(`https://api.themoviedb.org/3/tv/airing_today?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const airingTodayShowsData = await airingTodayShowsResponse.json();
				
				// Filter out unreleased shows
				const filteredAiringTodayShows = filterReleasedContent(airingTodayShowsData.results || []);
				
				return NextResponse.json({
					...airingTodayShowsData,
					results: filteredAiringTodayShows
				});

			case 'getMovieRecommendations':
				const movieRecommendationsResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/recommendations?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const movieRecommendationsData = await movieRecommendationsResponse.json();
				
				// Filter released content and add media_type to each recommendation
				const correctedMovieRecommendations = filterReleasedContent(movieRecommendationsData.results || []).map((movie) => ({
					...movie,
					media_type: "movie"
				}));
				
				return NextResponse.json({
					...movieRecommendationsData,
					results: correctedMovieRecommendations
				});

			case 'getTVRecommendations':
				const tvRecommendationsResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/recommendations?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const tvRecommendationsData = await tvRecommendationsResponse.json();
				
				// Filter released content and add media_type to each recommendation
				const correctedTVRecommendations = filterReleasedContent(tvRecommendationsData.results || []).map((show) => ({
					...show,
					media_type: "tv"
				}));
				
				return NextResponse.json({
					...tvRecommendationsData,
					results: correctedTVRecommendations
				});

			case 'getSimilarMovies':
				const similarMoviesResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/similar?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const similarMoviesData = await similarMoviesResponse.json();
				
				// Filter released content and add media_type to each similar movie
				const correctedSimilarMovies = filterReleasedContent(similarMoviesData.results || []).map((movie) => ({
					...movie,
					media_type: "movie"
				}));
				
				return NextResponse.json({
					...similarMoviesData,
					results: correctedSimilarMovies
				});

			case 'getSimilarTV':
				const similarTVResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/similar?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const similarTVData = await similarTVResponse.json();
				
				// Filter released content and add media_type to each similar show
				const correctedSimilarTV = filterReleasedContent(similarTVData.results || []).map((show) => ({
					...show,
					media_type: "tv"
				}));
				
				return NextResponse.json({
					...similarTVData,
					results: correctedSimilarTV
				});

			default:
				return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error) {
		console.error('API Error:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
} 