/**
 * API Service for Flyx TV
 * Handles all API calls and data fetching for the WebOS TV app
 * 
 * CONFIGURATION:
 * To enable real API calls, set enableAPIAttempts = true and update serverURL below
 * By default, the app runs in demo mode with sample data
 */

function APIService() {
    // Detect if running locally or on server
    var origin = window.location.origin;
    
    // Configuration for API behavior
    this.enableAPIAttempts = false; // Set to true if you have a Flyx server running
    this.serverURL = 'http://localhost:3000'; // Change this to your Flyx server URL
    
    // If running from file:// protocol, default to demo mode
    if (origin.indexOf('file://') === 0) {
        this.baseURL = this.serverURL;
        console.log('Running in file:// mode - API attempts disabled by default');
        console.log('To enable API calls, set enableAPIAttempts = true and update serverURL in api-service.js');
    } else {
        this.baseURL = origin;
        this.enableAPIAttempts = true; // Enable when running from actual server
        console.log('Running from server, API enabled:', this.baseURL);
    }
    
    this.apiEndpoints = {
        trending: '/api/trending-movies',
        trendingShows: '/api/trending-shows',
        search: '/api/search-movie',
        tmdb: '/api/tmdb',
        extractStream: '/api/extract-stream',
        subtitles: '/api/subtitles'
    };
    
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.apiFailureCount = 0;
    this.maxFailures = 3; // Stop trying after 3 failures
    
    console.log('API Service initialized - Demo mode active');
}

// Generic fetch method with error handling and caching
APIService.prototype.fetchWithCache = function(url, options) {
    if (typeof options === 'undefined') {
        options = {};
    }
    
    var cacheKey = url + JSON.stringify(options);
    var self = this;
    
    // Check cache first
    if (this.cache[cacheKey]) {
        var cached = this.cache[cacheKey];
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
            return Promise.resolve(cached.data);
        }
    }

    // Skip API calls if disabled or too many failures
    if (!this.enableAPIAttempts) {
        return Promise.reject(new Error('API_DISABLED'));
    }
    
    if (this.apiFailureCount >= this.maxFailures) {
        return Promise.reject(new Error('API_MAX_FAILURES_REACHED'));
    }
    
    var fetchOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Merge headers if provided
    if (options.headers) {
        for (var key in options.headers) {
            fetchOptions.headers[key] = options.headers[key];
        }
    }
    
    // Merge other options
    for (var prop in options) {
        if (prop !== 'headers') {
            fetchOptions[prop] = options[prop];
        }
    }

    return fetch(url, fetchOptions)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            self.apiFailureCount = 0; // Reset failure count on success
            return response.json();
        })
        .then(function(data) {
            // Cache the result
            self.cache[cacheKey] = {
                data: data,
                timestamp: Date.now()
            };
            return data;
        })
        .catch(function(error) {
            self.apiFailureCount++;
            
            if (self.apiFailureCount >= self.maxFailures) {
                console.warn('API calls disabled after', self.maxFailures, 'failures. Using demo data only.');
            }
            
            throw error;
        });
};

// Get trending movies for today
APIService.prototype.getTrendingToday = function() {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.trending;
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            // Only log errors if it's not due to API being disabled
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('API not available, using demo data');
            }
            return self.getFallbackData('trending-today');
        });
};

// Get trending movies for this week
APIService.prototype.getTrendingWeek = function() {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.trending + '?timeframe=week';
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('API not available, using demo data');
            }
            return self.getFallbackData('trending-week');
        });
};

// Get popular anime
APIService.prototype.getPopularAnime = function() {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.trending + '?genre=anime';
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('API not available, using demo data');
            }
            return self.getFallbackData('popular-anime');
        });
};

// Search for movies and TV shows
APIService.prototype.searchContent = function(query) {
    if (!query || query.trim().length === 0) {
        return Promise.resolve([]);
    }

    var self = this;
    var url = this.baseURL + this.apiEndpoints.search + '?query=' + encodeURIComponent(query);
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Search API not available');
            }
            // Return demo search results based on query
            return self.getSearchFallbackData(query);
        });
};

// Get movie/show details
APIService.prototype.getContentDetails = function(id, type) {
    if (typeof type === 'undefined') {
        type = 'movie';
    }
    
    var self = this;
    var url = this.baseURL + this.apiEndpoints.tmdb + '?id=' + id + '&type=' + type;
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatDetailedMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Content details API not available');
            }
            return self.getDetailsFallbackData(id);
        });
};

// Get streaming information
APIService.prototype.getStreamingInfo = function(id, type) {
    if (typeof type === 'undefined') {
        type = 'movie';
    }
    
    var url = this.baseURL + this.apiEndpoints.extractStream + '?id=' + id + '&type=' + type;
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return data;
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Streaming API not available');
            }
            // Return demo streaming info
            return {
                streamUrl: 'demo://stream/' + id,
                title: 'Demo Stream',
                description: 'This is a demo stream URL'
            };
        });
};

// Get subtitles
APIService.prototype.getSubtitles = function(id, language) {
    if (typeof language === 'undefined') {
        language = 'en';
    }
    
    var url = this.baseURL + this.apiEndpoints.subtitles + '?id=' + id + '&lang=' + language;
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return data;
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Subtitles API not available');
            }
            return null;
        });
};

// Format movie data for consistent structure
APIService.prototype.formatMovieData = function(data) {
    if (!data || !Array.isArray(data)) {
        return [];
    }

    var self = this;
    return data.map(function(item) {
        return {
            id: item.id || item.tmdb_id || Math.random().toString(36).substr(2, 9),
            title: item.title || item.name || 'Unknown Title',
            year: self.extractYear(item.release_date || item.first_air_date),
            poster: self.formatPosterUrl(item.poster_path),
            backdrop: self.formatBackdropUrl(item.backdrop_path),
            rating: item.vote_average || 0,
            overview: item.overview || '',
            media_type: item.media_type || 'movie',
            genre_ids: item.genre_ids || [],
            popularity: item.popularity || 0
        };
    });
};

// Format detailed movie data
APIService.prototype.formatDetailedMovieData = function(data) {
    if (!data) return null;

    var runtime = data.runtime || 0;
    if (!runtime && data.episode_run_time && data.episode_run_time.length > 0) {
        runtime = data.episode_run_time[0];
    }

    var cast = [];
    if (data.credits && data.credits.cast) {
        cast = data.credits.cast.slice(0, 10);
    }

    var crew = null;
    if (data.credits && data.credits.crew) {
        crew = data.credits.crew;
    }

    return {
        id: data.id,
        title: data.title || data.name,
        year: this.extractYear(data.release_date || data.first_air_date),
        poster: this.formatPosterUrl(data.poster_path),
        backdrop: this.formatBackdropUrl(data.backdrop_path),
        rating: data.vote_average || 0,
        overview: data.overview || '',
        runtime: runtime,
        genres: data.genres || [],
        cast: cast,
        director: this.extractDirector(crew),
        media_type: data.media_type || (data.title ? 'movie' : 'tv'),
        status: data.status,
        tagline: data.tagline,
        production_companies: data.production_companies || [],
        spoken_languages: data.spoken_languages || []
    };
};

// Helper methods
APIService.prototype.extractYear = function(dateString) {
    if (!dateString) return '';
    return new Date(dateString).getFullYear().toString();
};

APIService.prototype.formatPosterUrl = function(posterPath) {
    if (!posterPath) return '/assets/placeholder-poster.jpg';
    if (posterPath.startsWith('http')) return posterPath;
    return 'https://image.tmdb.org/t/p/w500' + posterPath;
};

APIService.prototype.formatBackdropUrl = function(backdropPath) {
    if (!backdropPath) return '/assets/placeholder-backdrop.jpg';
    if (backdropPath.startsWith('http')) return backdropPath;
    return 'https://image.tmdb.org/t/p/w1280' + backdropPath;
};

APIService.prototype.extractDirector = function(crew) {
    if (!crew || !Array.isArray(crew)) return '';
    
    for (var i = 0; i < crew.length; i++) {
        if (crew[i].job === 'Director') {
            return crew[i].name;
        }
    }
    return '';
};

// Fallback data for when API is unavailable
APIService.prototype.getFallbackData = function(category) {
    var fallbackMovies = [
        {
            id: 'demo-1',
            title: 'The Matrix',
            year: '1999',
            poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg',
            rating: 8.7,
            overview: 'A computer programmer discovers that reality as he knows it is a simulation.',
            media_type: 'movie'
        },
        {
            id: 'demo-2',
            title: 'Inception',
            year: '2010',
            poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg',
            rating: 8.8,
            overview: 'A thief who steals corporate secrets through dream-sharing technology.',
            media_type: 'movie'
        },
        {
            id: 'demo-3',
            title: 'Breaking Bad',
            year: '2008',
            poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg',
            rating: 9.5,
            overview: 'A high school chemistry teacher turned methamphetamine producer.',
            media_type: 'tv'
        },
        {
            id: 'demo-4',
            title: 'The Dark Knight',
            year: '2008',
            poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg',
            rating: 9.0,
            overview: 'Batman faces the Joker in this epic superhero thriller.',
            media_type: 'movie'
        },
        {
            id: 'demo-5',
            title: 'Stranger Things',
            year: '2016',
            poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg',
            rating: 8.7,
            overview: 'Kids in a small town encounter supernatural forces.',
            media_type: 'tv'
        }
    ];

    return fallbackMovies.slice(0, 3); // Return 3 items for demo
};

// Search fallback data
APIService.prototype.getSearchFallbackData = function(query) {
    var allMovies = [
        {
            id: 'demo-1', title: 'The Matrix', year: '1999', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.7, overview: 'A computer programmer discovers that reality as he knows it is a simulation.', media_type: 'movie'
        },
        {
            id: 'demo-2', title: 'Inception', year: '2010', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.8, overview: 'A thief who steals corporate secrets through dream-sharing technology.', media_type: 'movie'
        },
        {
            id: 'demo-3', title: 'Breaking Bad', year: '2008', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 9.5, overview: 'A high school chemistry teacher turned methamphetamine producer.', media_type: 'tv'
        },
        {
            id: 'demo-4', title: 'The Dark Knight', year: '2008', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 9.0, overview: 'Batman faces the Joker in this epic superhero thriller.', media_type: 'movie'
        },
        {
            id: 'demo-5', title: 'Stranger Things', year: '2016', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.7, overview: 'Kids in a small town encounter supernatural forces.', media_type: 'tv'
        }
    ];
    
    // Simple search filter for demo
    var queryLower = query.toLowerCase();
    var filtered = allMovies.filter(function(movie) {
        return movie.title.toLowerCase().indexOf(queryLower) !== -1;
    });
    
    // If no matches, return first 2 as "similar" results
    if (filtered.length === 0) {
        return allMovies.slice(0, 2);
    }
    
    return filtered;
};

// Content details fallback
APIService.prototype.getDetailsFallbackData = function(id) {
    // Find the item in our demo data
    var allMovies = [
        {
            id: 'demo-1', title: 'The Matrix', year: '1999', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.7, 
            overview: 'A computer programmer discovers that reality as he knows it is a simulation and joins a rebellion against the machines controlling humanity.',
            media_type: 'movie', runtime: 136, genres: [{name: 'Action'}, {name: 'Sci-Fi'}],
            cast: [{name: 'Keanu Reeves', character: 'Neo'}, {name: 'Laurence Fishburne', character: 'Morpheus'}],
            director: 'The Wachowskis'
        },
        {
            id: 'demo-2', title: 'Inception', year: '2010', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.8,
            overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
            media_type: 'movie', runtime: 148, genres: [{name: 'Action'}, {name: 'Drama'}, {name: 'Sci-Fi'}],
            cast: [{name: 'Leonardo DiCaprio', character: 'Dom Cobb'}, {name: 'Marion Cotillard', character: 'Mal'}],
            director: 'Christopher Nolan'
        }
    ];
    
    var movie = allMovies.find(function(m) { return m.id === id; });
    return movie || allMovies[0]; // Return first movie as fallback
};

// Clear cache
APIService.prototype.clearCache = function() {
    this.cache = {};
    console.log('API cache cleared');
};

// Get cache statistics
APIService.prototype.getCacheStats = function() {
    var keys = [];
    for (var key in this.cache) {
        keys.push(key);
    }
    
    return {
        size: keys.length,
        keys: keys
    };
};

// Health check
APIService.prototype.healthCheck = function() {
    return fetch(this.baseURL + '/api/health')
        .then(function(response) {
            return response.ok;
        })
        .catch(function(error) {
            console.error('Health check failed:', error);
            return false;
        });
};

// Test API connectivity
APIService.prototype.testConnectivity = function() {
    var self = this;
    var tests = [];
    
    return Promise.all([
        this.getTrendingToday()
            .then(function(result) {
                tests.push({
                    name: 'Trending Movies',
                    success: !!result
                });
            })
            .catch(function(error) {
                tests.push({
                    name: 'Trending Movies',
                    success: false,
                    error: error.message
                });
            }),
        
        this.searchContent('test')
            .then(function(result) {
                tests.push({
                    name: 'Search',
                    success: !!result
                });
            })
            .catch(function(error) {
                tests.push({
                    name: 'Search',
                    success: false,
                    error: error.message
                });
            })
    ]).then(function() {
        return tests;
    });
};

// === NEW ENHANCED API METHODS ===

// Get popular movies in USA
APIService.prototype.getPopularMoviesUSA = function() {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.trending + '?type=movie&region=US&category=popular';
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Popular movies USA API not available, using demo data');
            }
            return self.getFallbackData('popular-movies-usa');
        });
};

// Get popular TV shows in USA
APIService.prototype.getPopularShowsUSA = function() {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.trending + '?type=tv&region=US&category=popular';
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Popular TV shows USA API not available, using demo data');
            }
            return self.getFallbackData('popular-shows-usa');
        });
};

// Get trending anime
APIService.prototype.getTrendingAnime = function() {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.trending + '?type=tv&genre=anime&region=JP';
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Trending anime API not available, using demo data');
            }
            return self.getFallbackData('trending-anime');
        });
};

// === ADVANCED SEARCH METHODS ===

// Search by media type
APIService.prototype.searchByMediaType = function(query, mediaType) {
    if (!query || query.trim().length === 0) {
        return Promise.resolve([]);
    }

    var self = this;
    var url = this.baseURL + this.apiEndpoints.search + '?query=' + encodeURIComponent(query) + '&type=' + encodeURIComponent(mediaType || 'all');
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Media type search API not available');
            }
            return self.getSearchFallbackData(query);
        });
};

// Search by genre
APIService.prototype.searchByGenre = function(genreId, mediaType) {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.search + '?genre=' + encodeURIComponent(genreId) + '&type=' + encodeURIComponent(mediaType || 'movie');
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Genre search API not available');
            }
            return self.getFallbackData('genre-search');
        });
};

// Search by cast/crew
APIService.prototype.searchByCastCrew = function(personName, mediaType) {
    if (!personName || personName.trim().length === 0) {
        return Promise.resolve([]);
    }

    var self = this;
    var url = this.baseURL + this.apiEndpoints.search + '?person=' + encodeURIComponent(personName) + '&type=' + encodeURIComponent(mediaType || 'all');
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return self.formatMovieData(data);
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Cast/crew search API not available');
            }
            return self.getSearchFallbackData(personName);
        });
};

// Get genres list
APIService.prototype.getGenres = function(mediaType) {
    var self = this;
    var url = this.baseURL + this.apiEndpoints.tmdb + '?action=genres&type=' + encodeURIComponent(mediaType || 'movie');
    
    return this.fetchWithCache(url)
        .then(function(data) {
            return data.genres || [];
        })
        .catch(function(error) {
            if (error.message !== 'API_DISABLED' && error.message !== 'API_MAX_FAILURES_REACHED') {
                console.warn('Genres API not available');
            }
            return self.getDemoGenres(mediaType);
        });
};

// === ENHANCED FALLBACK DATA ===

// Enhanced fallback data for new sections
APIService.prototype.getFallbackData = function(category) {
    var fallbackMovies = [
        {
            id: 'demo-1', title: 'The Matrix', year: '1999', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.7, 
            overview: 'A computer programmer discovers that reality as he knows it is a simulation.',
            media_type: 'movie'
        },
        {
            id: 'demo-2', title: 'Inception', year: '2010', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.8,
            overview: 'A thief who steals corporate secrets through dream-sharing technology.',
            media_type: 'movie'
        },
        {
            id: 'demo-3', title: 'Breaking Bad', year: '2008', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 9.5,
            overview: 'A high school chemistry teacher turned methamphetamine producer.',
            media_type: 'tv'
        },
        {
            id: 'demo-4', title: 'The Dark Knight', year: '2008', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 9.0,
            overview: 'Batman faces the Joker in this epic superhero thriller.',
            media_type: 'movie'
        },
        {
            id: 'demo-5', title: 'Stranger Things', year: '2016', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.7,
            overview: 'Kids in a small town encounter supernatural forces.',
            media_type: 'tv'
        },
        {
            id: 'demo-6', title: 'Attack on Titan', year: '2013', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 9.0,
            overview: 'Humanity fights for survival against giant humanoid Titans.',
            media_type: 'tv'
        },
        {
            id: 'demo-7', title: 'Top Gun: Maverick', year: '2022', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.3,
            overview: 'After thirty years, Maverick is still pushing the envelope.',
            media_type: 'movie'
        },
        {
            id: 'demo-8', title: 'The Last of Us', year: '2023', poster: '/assets/placeholder-poster.jpg',
            backdrop: '/assets/placeholder-backdrop.jpg', rating: 8.8,
            overview: 'A post-apocalyptic drama following survivors of a fungal infection.',
            media_type: 'tv'
        }
    ];

    switch (category) {
        case 'popular-movies-usa':
            return fallbackMovies.filter(function(item) { return item.media_type === 'movie'; }).slice(0, 6);
        case 'popular-shows-usa':
            return fallbackMovies.filter(function(item) { return item.media_type === 'tv'; }).slice(0, 6);
        case 'trending-anime':
            return fallbackMovies.filter(function(item) { return item.media_type === 'tv'; }).slice(0, 4);
        case 'genre-search':
            return fallbackMovies.slice(0, 8);
        default:
            return fallbackMovies.slice(0, 3);
    }
};

// Demo genres for fallback
APIService.prototype.getDemoGenres = function(mediaType) {
    var movieGenres = [
        { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
        { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 18, name: 'Drama' },
        { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' }, { id: 53, name: 'Thriller' }
    ];
    
    var tvGenres = [
        { id: 10759, name: 'Action & Adventure' }, { id: 16, name: 'Animation' }, { id: 35, name: 'Comedy' },
        { id: 80, name: 'Crime' }, { id: 18, name: 'Drama' }, { id: 9648, name: 'Mystery' },
        { id: 10765, name: 'Sci-Fi & Fantasy' }
    ];
    
    return mediaType === 'tv' ? tvGenres : movieGenres;
};

// Helper function for safe placeholder images
APIService.prototype.getPlaceholderImage = function(type) {
    // Use safe inline SVG instead of external files that might not exist
    if (type === 'poster') {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjQyMCIgdmlld0JveD0iMCAwIDI4MCA0MjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iNDIwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIzNDAiIGZpbGw9InJnYmEoOTksIDEwMiwgMjQxLCAwLjIpIiBzdHJva2U9InJnYmEoOTksIDEwMiwgMjQxLCAwLjQpIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxNDAiIHk9IjIwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    } else {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjIwMCIgeT0iMTAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMikiIHN0cm9rZT0icmdiYSg5OSwgMTAyLCAyNDEsIDAuNCkiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSI0MDAiIHk9IjIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEJhY2tkcm9wPC90ZXh0Pgo8L3N2Zz4K';
    }
};

// Update helper functions to use safe placeholders
APIService.prototype.createImageUrl = function(imagePath, type) {
    if (!imagePath) return this.getPlaceholderImage(type);
    
    // Return TMDB image URL or the provided path
    if (imagePath.startsWith('http')) {
        return imagePath;
    } else if (imagePath.startsWith('/')) {
        return 'https://image.tmdb.org/t/p/w500' + imagePath;
    } else {
        return imagePath;
    }
};

// Initialize API Service
window.apiService = new APIService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
} 