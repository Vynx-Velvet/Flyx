import { NextResponse } from 'next/server';

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
				return NextResponse.json(showData);

			case 'getMovieDetails':
				const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=en-US`, tmdbOptions);
				const movieData = await movieResponse.json();
				return NextResponse.json(movieData);

			case 'getSeasonDetails':
				const seasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/season/${seasonId}?language=en-US`, tmdbOptions);
				const seasonData = await seasonResponse.json();
				return NextResponse.json(seasonData);

			case 'getIMDBtv':
				const externalIdsTvResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/external_ids`, tmdbOptions);
				const externalIdsData = await externalIdsTvResponse.json();
				const externalData = externalIdsData.imdb_id;
				return NextResponse.json({ externalData });

			case 'getTrendingNow':
				const trendingMoviesDailyResponse = await fetch(`https://api.themoviedb.org/3/trending/movie/day?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingShowsDailyResponse = await fetch(`https://api.themoviedb.org/3/trending/tv/day?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingMoviesDailyData = await trendingMoviesDailyResponse.json();
				const trendingShowsDailyData = await trendingShowsDailyResponse.json();
				
				// Add media_type to each item and combine results
				const moviesWithType = trendingMoviesDailyData.results?.map(movie => ({
					...movie,
					media_type: "movie"
				})) || [];
				
				const showsWithType = trendingShowsDailyData.results?.map(show => ({
					...show,
					media_type: "tv"
				})) || [];
				
				// Combine and shuffle the results
				const combinedResults = [...moviesWithType, ...showsWithType]
					.sort(() => Math.random() - 0.5)
					.slice(0, 20); // Limit to 20 items
				
				return NextResponse.json({
					...trendingMoviesDailyData,
					results: combinedResults
				});

			case 'getTrendingWeekly':
				const trendingMoviesWeeklyResponse = await fetch(`https://api.themoviedb.org/3/trending/movie/week?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingShowsWeeklyResponse = await fetch(`https://api.themoviedb.org/3/trending/tv/week?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const trendingMoviesWeeklyData = await trendingMoviesWeeklyResponse.json();
				const trendingShowsWeeklyData = await trendingShowsWeeklyResponse.json();
				
				// Add media_type to each item and combine results
				const moviesWithTypeWeekly = trendingMoviesWeeklyData.results?.map(movie => ({
					...movie,
					media_type: "movie"
				})) || [];
				
				const showsWithTypeWeekly = trendingShowsWeeklyData.results?.map(show => ({
					...show,
					media_type: "tv"
				})) || [];
				
				// Combine and shuffle the results
				const combinedWeeklyResults = [...moviesWithTypeWeekly, ...showsWithTypeWeekly]
					.sort(() => Math.random() - 0.5)
					.slice(0, 20); // Limit to 20 items
				
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

				// Check if `results` exists and map over it
				const correctedAnimeResponseData = popularAnimeResponseData.results.map((anime) => {
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

					// Map over the results to ensure consistent structure
					const correctedSearchResults = searchData.results.map((result) => {
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
				return NextResponse.json(topRatedMoviesData);

			case 'getUpcomingMovies':
				const upcomingMoviesResponse = await fetch(`https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const upcomingMoviesData = await upcomingMoviesResponse.json();
				return NextResponse.json(upcomingMoviesData);

			case 'getAiringTodayShows':
				const airingTodayShowsResponse = await fetch(`https://api.themoviedb.org/3/tv/airing_today?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const airingTodayShowsData = await airingTodayShowsResponse.json();
				return NextResponse.json(airingTodayShowsData);

			case 'getMovieRecommendations':
				const movieRecommendationsResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/recommendations?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const movieRecommendationsData = await movieRecommendationsResponse.json();
				
				// Add media_type to each recommendation
				const correctedMovieRecommendations = movieRecommendationsData.results?.map((movie) => ({
					...movie,
					media_type: "movie"
				})) || [];
				
				return NextResponse.json({
					...movieRecommendationsData,
					results: correctedMovieRecommendations
				});

			case 'getTVRecommendations':
				const tvRecommendationsResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/recommendations?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const tvRecommendationsData = await tvRecommendationsResponse.json();
				
				// Add media_type to each recommendation
				const correctedTVRecommendations = tvRecommendationsData.results?.map((show) => ({
					...show,
					media_type: "tv"
				})) || [];
				
				return NextResponse.json({
					...tvRecommendationsData,
					results: correctedTVRecommendations
				});

			case 'getSimilarMovies':
				const similarMoviesResponse = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/similar?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const similarMoviesData = await similarMoviesResponse.json();
				
				// Add media_type to each similar movie
				const correctedSimilarMovies = similarMoviesData.results?.map((movie) => ({
					...movie,
					media_type: "movie"
				})) || [];
				
				return NextResponse.json({
					...similarMoviesData,
					results: correctedSimilarMovies
				});

			case 'getSimilarTV':
				const similarTVResponse = await fetch(`https://api.themoviedb.org/3/tv/${movieId}/similar?language=en-US&page=${pageNumber ? pageNumber : 1}`, tmdbOptions);
				const similarTVData = await similarTVResponse.json();
				
				// Add media_type to each similar show
				const correctedSimilarTV = similarTVData.results?.map((show) => ({
					...show,
					media_type: "tv"
				})) || [];
				
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