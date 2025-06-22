/**
 * Standalone API Client for Flyx WebOS TV
 * Direct TMDB integration and VM-Server stream extraction
 * No dependency on webapp API endpoints
 * ES5 Compatible with proper error handling
 */

function APIClient() {
    // Direct TMDB configuration
    this.tmdbBaseURL = 'https://api.themoviedb.org/3';
    this.tmdbImageBaseURL = 'https://image.tmdb.org/t/p/';
    this.tmdbApiKey = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiODlhY2RkODdlMTJjMjgzZjU2ZmViMmUwMTZiNDk2NCIsIm5iZiI6MTcxOTg4MzU2OS40NDU1MDcsInN1YiI6IjY2ODE5MzQ5NjhlOTgzNmRjZWRkNDM3NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bETg1ujNoewklg0L0Q3hOZuqnaB9v7V4XzenHmlLYso';
    
    // VM-Server configuration with CORS proxy fallback
    this.vmServerURL = 'http://35.188.123.210:3001';
    this.vmServerProxyURL = 'https://cors-anywhere.herokuapp.com/http://35.188.123.210:3001';
    this.vmServerBackupURL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('http://35.188.123.210:3001');
    
    // Caching and reliability
    this.cache = {};
    this.cacheTimeout = 300000; // 5 minutes
    this.requestTimeout = 15000; // 15 seconds
    this.maxRetries = 3;
    this.apiFailures = 0;
    this.maxFailures = 5;
    this.failureLogged = false;
    
    console.log('🎬 Standalone API Client initialized for WebOS TV', {
        tmdbDirect: true,
        vmServerDirect: true,
        tmdbBaseURL: this.tmdbBaseURL,
        vmServerURL: this.vmServerURL,
        corsProxyAvailable: true,
        demoStreamsReady: true
    });
}

// TMDB Request Headers
APIClient.prototype.getTMDBHeaders = function() {
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': this.tmdbApiKey
    };
};

// VM-Server Request Headers
APIClient.prototype.getVMHeaders = function() {
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        // Note: User-Agent cannot be set in browser environment
    };
};

// Enhanced request method with retry logic
APIClient.prototype.makeRequest = function(url, options, retryCount) {
    var self = this;
    options = options || {};
    retryCount = retryCount || 0;
    
    // Check cache first
    var cacheKey = url + JSON.stringify(options);
    var cached = this.cache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return this.createResolvedPromise(cached.data);
    }
    
    // Prepare request options
    var requestOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        mode: 'cors',
        credentials: 'omit'
    };
    
    if (options.body) {
        requestOptions.body = JSON.stringify(options.body);
    }
    
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        var timeoutId;
        
        timeoutId = setTimeout(function() {
            xhr.abort();
            reject(new Error('Request timeout'));
        }, self.requestTimeout);
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                clearTimeout(timeoutId);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        
                        // Cache successful response
                        self.cache[cacheKey] = {
                            data: data,
                            timestamp: Date.now()
                        };
                        
                        self.apiFailures = 0;
                        resolve(data);
                        
                    } catch (parseError) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    var error = new Error('API Error: ' + xhr.status + ' - ' + xhr.statusText);
                    error.status = xhr.status;
                    error.response = xhr.responseText;
                    error.url = url;
                    
                    self.apiFailures++;
                    
                    console.error('🚨 API Request Failed:', {
                        url: url.substring(0, 100),
                        status: xhr.status,
                        statusText: xhr.statusText,
                        retryCount: retryCount
                    });
                    
                    // Retry on certain errors
                    if (retryCount < self.maxRetries && (xhr.status >= 500 || xhr.status === 0)) {
                        console.log('🔄 Retrying API request in ' + (1000 * (retryCount + 1)) + 'ms...');
                        setTimeout(function() {
                            self.makeRequest(url, options, retryCount + 1)
                                .then(resolve)
                                .catch(reject);
                        }, 1000 * (retryCount + 1));
                    } else {
                        reject(error);
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            clearTimeout(timeoutId);
            self.apiFailures++;
            reject(new Error('Network error'));
        };
        
        xhr.open(requestOptions.method, url, true);
        
        for (var header in requestOptions.headers) {
            xhr.setRequestHeader(header, requestOptions.headers[header]);
        }
        
        xhr.send(requestOptions.body || null);
    });
};

// Utility functions
APIClient.prototype.createResolvedPromise = function(value) {
    return new Promise(function(resolve) {
        resolve(value);
    });
};

APIClient.prototype.createRejectedPromise = function(error) {
    return new Promise(function(resolve, reject) {
        reject(error);
    });
};

// Filter unreleased content (from webapp logic)
APIClient.prototype.filterReleasedContent = function(items) {
    var today = new Date().toISOString().split('T')[0];
    
    return items.filter(function(item) {
        var releaseDate = item.release_date || item.first_air_date;
        return releaseDate && releaseDate <= today;
    });
};

// === DIRECT TMDB API METHODS ===

APIClient.prototype.getTrendingToday = function() {
    var self = this;
    
    console.log('🎬 Fetching trending today directly from TMDB');
    
    var moviesPromise = this.makeRequest(
        this.tmdbBaseURL + '/trending/movie/day?language=en-US&page=1',
        { headers: this.getTMDBHeaders() }
    );
    
    var showsPromise = this.makeRequest(
        this.tmdbBaseURL + '/trending/tv/day?language=en-US&page=1',
        { headers: this.getTMDBHeaders() }
    );
    
    return Promise.all([moviesPromise, showsPromise])
        .then(function(responses) {
            var moviesData = responses[0];
            var showsData = responses[1];
            
            // Add media_type and filter released content
            var moviesWithType = self.filterReleasedContent(moviesData.results || []).map(function(movie) {
                return Object.assign({}, movie, { media_type: 'movie' });
            });
            
            var showsWithType = self.filterReleasedContent(showsData.results || []).map(function(show) {
                return Object.assign({}, show, { media_type: 'tv' });
            });
            
            // Combine results (interleaved)
            var combinedResults = [];
            var maxLength = Math.max(moviesWithType.length, showsWithType.length);
            for (var i = 0; i < maxLength && combinedResults.length < 20; i++) {
                if (i < moviesWithType.length) combinedResults.push(moviesWithType[i]);
                if (i < showsWithType.length && combinedResults.length < 20) combinedResults.push(showsWithType[i]);
            }
            
            return self.formatMovieList(combinedResults);
        })
        .catch(function(error) {
            if (!self.failureLogged) {
                console.warn('🚨 TMDB API failed, falling back to demo data:', error.message);
                self.failureLogged = true;
            }
            return self.getDemoMovies('trending-today');
        });
};

APIClient.prototype.getTrendingWeek = function() {
    var self = this;
    
    console.log('🎬 Fetching trending week directly from TMDB');
    
    var moviesPromise = this.makeRequest(
        this.tmdbBaseURL + '/trending/movie/week?language=en-US&page=1',
        { headers: this.getTMDBHeaders() }
    );
    
    var showsPromise = this.makeRequest(
        this.tmdbBaseURL + '/trending/tv/week?language=en-US&page=1',
        { headers: this.getTMDBHeaders() }
    );
    
    return Promise.all([moviesPromise, showsPromise])
        .then(function(responses) {
            var moviesData = responses[0];
            var showsData = responses[1];
            
            var moviesWithType = self.filterReleasedContent(moviesData.results || []).map(function(movie) {
                return Object.assign({}, movie, { media_type: 'movie' });
            });
            
            var showsWithType = self.filterReleasedContent(showsData.results || []).map(function(show) {
                return Object.assign({}, show, { media_type: 'tv' });
            });
            
            var combinedResults = [];
            var maxLength = Math.max(moviesWithType.length, showsWithType.length);
            for (var i = 0; i < maxLength && combinedResults.length < 20; i++) {
                if (i < moviesWithType.length) combinedResults.push(moviesWithType[i]);
                if (i < showsWithType.length && combinedResults.length < 20) combinedResults.push(showsWithType[i]);
            }
            
            return self.formatMovieList(combinedResults);
        })
        .catch(function(error) {
            console.warn('🚨 TMDB trending week failed:', error.message);
            return self.getDemoMovies('trending-week');
        });
};

APIClient.prototype.getPopularShows = function() {
    var self = this;
    
    console.log('🎬 Fetching popular anime directly from TMDB');
    
    var url = this.tmdbBaseURL + '/discover/tv?first_air_date.gte=2024-01-01&include_adult=false&include_null_first_air_dates=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=16&with_origin_country=JP';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(anime) {
                return Object.assign({}, anime, { media_type: 'tv' });
            });
            
            return self.formatMovieList(filteredResults);
        })
        .catch(function(error) {
            console.warn('🚨 TMDB popular shows failed:', error.message);
            return self.getDemoMovies('popular-shows');
        });
};

APIClient.prototype.searchContent = function(query) {
    var self = this;
    
    if (!query || query.trim().length === 0) {
        return this.createResolvedPromise([]);
    }
    
    console.log('🔍 Searching TMDB directly for:', query);
    
    var url = this.tmdbBaseURL + '/search/multi?query=' + encodeURIComponent(query.trim()) + '&language=en-US&page=1&include_adult=false';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, {
                    media_type: result.media_type || 'unknown'
                });
            });
            
            return self.formatMovieList(filteredResults);
        })
        .catch(function(error) {
            console.warn('🚨 TMDB search failed:', error.message);
            return self.getDemoSearchResults(query);
        });
};

APIClient.prototype.getMovieDetails = function(id, mediaType) {
    var self = this;
    mediaType = mediaType || 'movie';
    
    console.log('🎬 Fetching', mediaType, 'details directly from TMDB for ID:', id);
    
    // Fetch main details
    var detailsUrl = this.tmdbBaseURL + '/' + mediaType + '/' + encodeURIComponent(id) + '?language=en-US';
    var detailsPromise = this.makeRequest(detailsUrl, { headers: this.getTMDBHeaders() });
    
    // Fetch external IDs
    var externalIdsUrl = this.tmdbBaseURL + '/' + mediaType + '/' + encodeURIComponent(id) + '/external_ids';
    var externalIdsPromise = this.makeRequest(externalIdsUrl, { headers: this.getTMDBHeaders() });
    
    // Fetch credits (cast & crew)
    var creditsUrl = this.tmdbBaseURL + '/' + mediaType + '/' + encodeURIComponent(id) + '/credits';
    var creditsPromise = this.makeRequest(creditsUrl, { headers: this.getTMDBHeaders() });
    
    return Promise.all([detailsPromise, externalIdsPromise, creditsPromise])
        .then(function(responses) {
            var details = responses[0];
            var externalIds = responses[1];
            var credits = responses[2];
            
            // Combine all data
            var enrichedDetails = Object.assign({}, details, {
                external_ids: externalIds,
                imdb_id: externalIds.imdb_id,
                credits: credits,
                subtitle_ready: {
                    imdb_id: externalIds.imdb_id,
                    type: mediaType
                }
            });
            
            return self.formatMovieDetails(enrichedDetails);
        })
        .catch(function(error) {
            console.warn('🚨 TMDB details failed:', error.message);
            return self.getDemoMovieDetails(id);
        });
};

// === DIRECT VM-SERVER STREAM EXTRACTION ===

APIClient.prototype.getMovieStream = function(movieId) {
    var self = this;
    
    console.log('🚀 Attempting to get movie stream for:', movieId);
    
    // First, try direct VM server connection
    return this.tryVMServerDirect(movieId, 'movie')
        .catch(function(error) {
            console.warn('❌ Direct VM-Server failed:', error.message);
            // Try CORS proxy as backup
            return self.tryVMServerProxy(movieId, 'movie');
        })
        .catch(function(error) {
            console.error('❌ ALL VM-Server methods failed:', error.message);
            // DO NOT use demo streams - throw the real error
            throw new Error('VM-extractor service failed: ' + error.message + '. Check VM-extractor service at: ' + self.vmServerURL);
        });
};

APIClient.prototype.tryVMServerDirect = function(mediaId, mediaType) {
    var self = this;
    var url = this.vmServerURL + '/extract?mediaType=' + mediaType + '&movieId=' + encodeURIComponent(mediaId) + '&server=vidsrc.xyz';
    
    console.log('🔗 Trying direct VM-Server:', url);
    
    return this.makeRequest(url, { 
        headers: this.getVMHeaders(),
        timeout: 30000 // 30 seconds timeout
    })
        .then(function(data) {
            if (data && data.success && data.streamUrl) {
                console.log('✅ Direct VM-Server success');
                return {
                    success: true,
                    streamUrl: data.streamUrl,
                    server: data.server || 'vidsrc.xyz',
                    quality: data.quality || 'HD',
                    subtitles: data.subtitles || [],
                    requestId: data.requestId,
                    vmResponseTime: data.vmResponseTime || null
                };
            } else {
                throw new Error('Invalid response from VM-Server');
            }
        });
};

APIClient.prototype.tryVMServerProxy = function(mediaId, mediaType) {
    var self = this;
    
    console.log('🔗 Trying CORS proxy for VM-Server...');
    
    // Note: Public CORS proxies are unreliable, this is mainly for testing
    // In production, you'd want your own proxy server
    var extractUrl = '/extract?mediaType=' + mediaType + '&movieId=' + encodeURIComponent(mediaId) + '&server=vidsrc.xyz';
    var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(this.vmServerURL + extractUrl);
    
    return this.makeRequest(proxyUrl, { 
        headers: {'Accept': 'application/json'},
        timeout: 45000 // 45 seconds timeout
    })
        .then(function(response) {
            if (response && response.contents) {
                var data = JSON.parse(response.contents);
                if (data && data.success && data.streamUrl) {
                    console.log('✅ Proxy VM-Server success');
                    return {
                        success: true,
                        streamUrl: data.streamUrl,
                        server: data.server || 'vidsrc.xyz (via proxy)',
                        quality: data.quality || 'HD',
                        subtitles: data.subtitles || [],
                        requestId: data.requestId,
                        vmResponseTime: data.vmResponseTime || null
                    };
                }
            }
            throw new Error('Proxy returned invalid response');
        });
};

APIClient.prototype.getTVEpisodeStream = function(tvId, season, episode) {
    var self = this;
    
    console.log('📺 Attempting to get TV episode stream for:', tvId, 'S' + season + 'E' + episode);
    
    // First, try direct VM server connection  
    return this.tryVMServerDirectTV(tvId, season, episode)
        .catch(function(error) {
            console.warn('❌ Direct VM-Server TV failed:', error.message);
            // Try CORS proxy as backup
            return self.tryVMServerProxyTV(tvId, season, episode);
        })
        .catch(function(error) {
            console.error('❌ ALL VM-Server TV methods failed:', error.message);
            // DO NOT use demo streams - throw the real error
            throw new Error('VM-extractor service failed for TV: ' + error.message + '. Check VM-extractor service at: ' + self.vmServerURL);
        });
};

APIClient.prototype.tryVMServerDirectTV = function(tvId, season, episode) {
    var self = this;
    var url = this.vmServerURL + '/extract?mediaType=tv&movieId=' + encodeURIComponent(tvId) + 
              '&seasonId=' + encodeURIComponent(season) + 
              '&episodeId=' + encodeURIComponent(episode) + 
              '&server=vidsrc.xyz';
    
    console.log('🔗 Trying direct VM-Server TV:', url);
    
    return this.makeRequest(url, { 
        headers: this.getVMHeaders(),
        timeout: 30000 // 30 seconds timeout
    })
        .then(function(data) {
            if (data && data.success && data.streamUrl) {
                console.log('✅ Direct VM-Server TV success');
                return {
                    success: true,
                    streamUrl: data.streamUrl,
                    server: data.server || 'vidsrc.xyz',
                    quality: data.quality || 'HD',
                    subtitles: data.subtitles || [],
                    season: season,
                    episode: episode,
                    requestId: data.requestId,
                    vmResponseTime: data.vmResponseTime || null
                };
            } else {
                throw new Error('Invalid TV response from VM-Server');
            }
        });
};

APIClient.prototype.tryVMServerProxyTV = function(tvId, season, episode) {
    var self = this;
    
    console.log('🔗 Trying CORS proxy for VM-Server TV...');
    
    var extractUrl = '/extract?mediaType=tv&movieId=' + encodeURIComponent(tvId) + 
                     '&seasonId=' + encodeURIComponent(season) + 
                     '&episodeId=' + encodeURIComponent(episode) + 
                     '&server=vidsrc.xyz';
    var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(this.vmServerURL + extractUrl);
    
    return this.makeRequest(proxyUrl, { 
        headers: {'Accept': 'application/json'},
        timeout: 45000 // 45 seconds timeout
    })
        .then(function(response) {
            if (response && response.contents) {
                var data = JSON.parse(response.contents);
                if (data && data.success && data.streamUrl) {
                    console.log('✅ Proxy VM-Server TV success');
                    return {
                        success: true,
                        streamUrl: data.streamUrl,
                        server: data.server || 'vidsrc.xyz (via proxy)',
                        quality: data.quality || 'HD',
                        subtitles: data.subtitles || [],
                        season: season,
                        episode: episode,
                        requestId: data.requestId,
                        vmResponseTime: data.vmResponseTime || null
                    };
                }
            }
            throw new Error('Proxy returned invalid TV response');
        });
};

// === FORMATTING AND UTILITY METHODS ===

APIClient.prototype.formatMovieList = function(data) {
    if (!data || !Array.isArray(data)) {
        return [];
    }
    
    var self = this;
    return data.map(function(item) {
        return {
            id: item.id || item.tmdb_id || 'movie-' + Math.random().toString(36).substr(2, 9),
            title: item.title || item.name || 'Unknown Title',
            year: self.extractYear(item.release_date || item.first_air_date),
            poster: self.formatImageURL(item.poster_path, 'poster'),
            backdrop: self.formatImageURL(item.backdrop_path, 'backdrop'),
            rating: parseFloat(item.vote_average || 0),
            overview: item.overview || '',
            mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
            genres: item.genre_ids || [],
            adult: item.adult || false,
            original_language: item.original_language || 'en',
            popularity: item.popularity || 0
        };
    });
};

APIClient.prototype.formatMovieDetails = function(data) {
    if (!data) return null;
    
    var runtime = data.runtime || 0;
    if (!runtime && data.episode_run_time && data.episode_run_time.length > 0) {
        runtime = data.episode_run_time[0];
    }
    
    return {
        id: data.id,
        title: data.title || data.name,
        year: this.extractYear(data.release_date || data.first_air_date),
        poster: this.formatImageURL(data.poster_path, 'poster'),
        backdrop: this.formatImageURL(data.backdrop_path, 'backdrop'),
        rating: parseFloat(data.vote_average || 0),
        overview: data.overview || '',
        runtime: runtime,
        genres: data.genres || [],
        cast: this.formatCast(data.credits),
        director: this.extractDirector(data.credits),
        mediaType: data.media_type || (data.title ? 'movie' : 'tv'),
        tagline: data.tagline || '',
        status: data.status || '',
        languages: data.spoken_languages || [],
        imdb_id: data.imdb_id || (data.external_ids && data.external_ids.imdb_id),
        external_ids: data.external_ids || {},
        subtitle_ready: data.subtitle_ready || {},
        budget: data.budget || 0,
        revenue: data.revenue || 0,
        homepage: data.homepage || '',
        production_companies: data.production_companies || [],
        number_of_seasons: data.number_of_seasons || 1
    };
};

APIClient.prototype.formatCast = function(credits) {
    if (!credits || !credits.cast) return [];
    
    console.log('🎭 Formatting cast data, found', credits.cast.length, 'cast members');
    
    return credits.cast.slice(0, 10).map(function(person, index) {
        var formattedActor = {
            name: person.name || 'Unknown Actor',
            character: person.character || 'Unknown Character',
            profilePath: person.profile_path,
            profile_path: person.profile_path, // Include both for compatibility
            order: person.order || index
        };
        
        console.log('🎭 Formatted actor:', formattedActor.name, 'Photo path:', formattedActor.profilePath);
        return formattedActor;
    });
};

APIClient.prototype.extractDirector = function(credits) {
    if (!credits || !credits.crew) return '';
    
    for (var i = 0; i < credits.crew.length; i++) {
        if (credits.crew[i].job === 'Director') {
            return credits.crew[i].name;
        }
    }
    return '';
};

APIClient.prototype.extractYear = function(dateString) {
    if (!dateString) return '';
    return new Date(dateString).getFullYear().toString();
};

APIClient.prototype.formatImageURL = function(imagePath, type) {
    if (!imagePath) {
        return type === 'poster' ? 'assets/placeholder-poster.jpg' : 'assets/placeholder-backdrop.jpg';
    }
    
    if (imagePath.indexOf('http') === 0) {
        return imagePath;
    }
    
    var size = type === 'poster' ? 'w500' : 'w1280';
    return this.tmdbImageBaseURL + size + imagePath;
};

// === ENHANCED DEMO DATA FALLBACKS ===

APIClient.prototype.getDemoMovies = function(category) {
    var demoMovies = [
        {
            id: 'demo-1', title: 'The Matrix', year: '1999',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.7, overview: 'A computer programmer discovers that reality as he knows it is a simulation.',
            mediaType: 'movie'
        },
        {
            id: 'demo-2', title: 'Inception', year: '2010',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.8, overview: 'A thief who steals corporate secrets through dream-sharing technology.',
            mediaType: 'movie'
        },
        {
            id: 'demo-3', title: 'Breaking Bad', year: '2008',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 9.5, overview: 'A high school chemistry teacher turned methamphetamine producer.',
            mediaType: 'tv', media_type: 'tv'
        },
        {
            id: 'demo-4', title: 'The Dark Knight', year: '2008',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 9.0, overview: 'Batman faces the Joker in this epic superhero thriller.',
            mediaType: 'movie'
        },
        {
            id: 'demo-5', title: 'Stranger Things', year: '2016',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.7, overview: 'Kids in a small town encounter supernatural forces.',
            mediaType: 'tv', media_type: 'tv'
        },
        {
            id: 'demo-6', title: 'The Avengers', year: '2012',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.0, overview: 'Earth\'s mightiest heroes must come together to stop an alien invasion.',
            mediaType: 'movie'
        },
        {
            id: 'demo-7', title: 'Attack on Titan', year: '2013',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 9.0, overview: 'Humanity fights for survival against giant humanoid Titans.',
            mediaType: 'tv', media_type: 'tv', genre_category: 'anime'
        },
        {
            id: 'demo-8', title: 'Demon Slayer', year: '2019',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.7, overview: 'A young boy becomes a demon slayer to save his sister.',
            mediaType: 'tv', media_type: 'tv', genre_category: 'anime'
        },
        {
            id: 'demo-9', title: 'Top Gun: Maverick', year: '2022',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.3, overview: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator.',
            mediaType: 'movie'
        },
        {
            id: 'demo-10', title: 'The Last of Us', year: '2023',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.8, overview: 'A post-apocalyptic drama following survivors of a fungal infection.',
            mediaType: 'tv', media_type: 'tv'
        },
        {
            id: 'demo-11', title: 'Spider-Man: No Way Home', year: '2021',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.4, overview: 'Spider-Man seeks help from Doctor Strange when his identity is revealed.',
            mediaType: 'movie'
        },
        {
            id: 'demo-12', title: 'Wednesday', year: '2022',
            poster: 'assets/placeholder-poster.jpg', backdrop: 'assets/placeholder-backdrop.jpg',
            rating: 8.1, overview: 'Wednesday Addams navigates her years as a student at Nevermore Academy.',
            mediaType: 'tv', media_type: 'tv'
        }
    ];
    
    switch (category) {
        case 'trending-today':
            return demoMovies.slice(0, 4);
        case 'popular-movies-usa':
            return demoMovies.filter(function(item) { return item.mediaType === 'movie'; }).slice(0, 6);
        case 'popular-shows-usa':
            return demoMovies.filter(function(item) { return item.mediaType === 'tv' && !item.genre_category; }).slice(0, 6);
        case 'trending-anime':
            return demoMovies.filter(function(item) { return item.genre_category === 'anime'; });
        case 'genre-search':
            return demoMovies.slice(0, 8);
        default:
            return demoMovies.slice(0, 6);
    }
};

APIClient.prototype.getDemoSearchResults = function(query) {
    var allMovies = this.getDemoMovies('all');
    var queryLower = query.toLowerCase();
    
    var results = allMovies.filter(function(movie) {
        return movie.title.toLowerCase().indexOf(queryLower) !== -1 ||
               movie.overview.toLowerCase().indexOf(queryLower) !== -1;
    });
    
    return results.length > 0 ? results : allMovies.slice(0, 2);
};

APIClient.prototype.getDemoMovieDetails = function(id) {
    var allMovies = this.getDemoMovies('all');
    var movie = null;
    
    for (var i = 0; i < allMovies.length; i++) {
        if (allMovies[i].id === id) {
            movie = allMovies[i];
            break;
        }
    }
    
    if (!movie) {
        movie = allMovies[0];
    }
    
    // Create a copy to avoid modifying the original
    movie = Object.assign({}, movie);
    
    // Add basic details
    movie.runtime = movie.mediaType === 'tv' ? 45 : 120;
    movie.genres = [{name: 'Action'}, {name: 'Drama'}, {name: 'Thriller'}];
    movie.cast = [
        {name: 'Demo Actor One', character: 'Main Character', profilePath: null},
        {name: 'Demo Actor Two', character: 'Supporting Character', profilePath: null},
        {name: 'Demo Actor Three', character: 'Villain', profilePath: null}
    ];
    movie.director = 'Demo Director';
    movie.tagline = movie.mediaType === 'tv' ? 'The ultimate TV series experience' : 'This is a demo movie';
    
    // TV Show specific details
    if (movie.mediaType === 'tv' || movie.media_type === 'tv') {
        console.log('🔧 Setting up demo TV show details for:', movie.title);
        movie.number_of_seasons = 5;
        movie.episode_run_time = [45, 60];
        movie.first_air_date = movie.year + '-01-01';
        movie.last_air_date = (parseInt(movie.year) + 4) + '-12-31';
        movie.status = 'Ended';
        movie.type = 'Scripted';
        movie.in_production = false;
        
        // Ensure mediaType is consistently set
        movie.mediaType = 'tv';
        movie.media_type = 'tv';
        
        console.log('✅ Demo TV show setup complete:', {
            title: movie.title,
            mediaType: movie.mediaType,
            number_of_seasons: movie.number_of_seasons
        });
    } else {
        // Movie specific details
        movie.budget = 100000000;
        movie.revenue = 300000000;
        movie.release_date = movie.year + '-06-15';
        movie.status = 'Released';
    }
    
    return movie;
};

// ERROR: This function should not be used - VM-extractor should provide real streams
APIClient.prototype.getWorkingDemoStream = function(mediaId, mediaType, season, episode) {
    var self = this;
    
    console.error('❌ ERROR: getWorkingDemoStream called - this should not happen! VM-extractor should provide real streams');
    
    throw new Error('Demo streams disabled - VM-extractor service should provide real streaming URLs. Check VM-extractor service configuration.');
    
    // HLS test streams (if browser supports)
    var hlsTestStreams = [
        'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    ];
    
    // Select stream based on media ID (deterministic but varied)
    var streamIndex = this.hashMediaId(mediaId) % workingStreams.length;
    var hlsIndex = this.hashMediaId(mediaId) % hlsTestStreams.length;
    
    // Prefer HLS for better compatibility, fallback to MP4
    var selectedStream = hlsTestStreams[hlsIndex];
    var fallbackStream = workingStreams[streamIndex];
    
    // Create realistic stream response
    var streamResponse = {
        success: true,
        streamUrl: selectedStream,
        fallbackUrl: fallbackStream,
        server: 'demo-streaming-server',
        quality: 'HD (720p)',
        subtitles: [],
        requestId: 'demo-' + Date.now() + '-' + mediaId,
        vmResponseTime: 1500 + Math.random() * 1000, // Realistic response time
        isDemoData: true,
        demoMessage: '🎬 Using demo stream - Real content would play here in production'
    };
    
    // Add TV-specific metadata
    if (mediaType === 'tv' && season && episode) {
        streamResponse.season = season;
        streamResponse.episode = episode;
        streamResponse.episodeTitle = 'Demo Episode ' + episode;
    }
    
    // Simulate realistic delay
    return new Promise(function(resolve) {
        setTimeout(function() {
            console.log('✅ Working demo stream ready:', {
                streamUrl: selectedStream.substring(0, 50) + '...',
                fallback: fallbackStream.substring(0, 50) + '...',
                quality: streamResponse.quality
            });
            resolve(streamResponse);
        }, 800 + Math.random() * 700); // 0.8-1.5 second delay
    });
};

// Helper function to create deterministic hash from media ID
APIClient.prototype.hashMediaId = function(mediaId) {
    var hash = 0;
    var str = String(mediaId);
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
};

// Legacy demo functions DISABLED - use real VM-extractor service
APIClient.prototype.getDemoMovieStream = function(movieId) {
    throw new Error('Demo streams disabled - use real VM-extractor service instead');
};

APIClient.prototype.getDemoTVEpisodeStream = function(tvId, season, episode) {
    throw new Error('Demo TV streams disabled - use real VM-extractor service instead');
};

// === BACKWARD COMPATIBILITY ===

// Legacy method for backward compatibility
APIClient.prototype.getStreamingInfo = function(id, mediaType) {
    console.log('🔄 Legacy getStreamingInfo called, redirecting to direct methods');
    
    if (mediaType === 'tv') {
        return this.getTVEpisodeStream(id, 1, 1);
    } else {
        return this.getMovieStream(id);
    }
};

// === CACHE AND UTILITY METHODS ===

APIClient.prototype.clearCache = function() {
    this.cache = {};
    console.log('🗑️ API cache cleared');
};

APIClient.prototype.getCacheInfo = function() {
    var keys = [];
    for (var key in this.cache) {
        keys.push(key);
    }
    
    return {
        size: keys.length,
        keys: keys,
        timeout: this.cacheTimeout
    };
};

APIClient.prototype.testConnectivity = function() {
    var self = this;
    console.log('🔍 Testing connectivity to TMDB and VM-Server');
    
    // Test TMDB with a simple trending call
    var tmdbTest = this.makeRequest(
        this.tmdbBaseURL + '/trending/movie/day?page=1', 
        { headers: this.getTMDBHeaders() }
    ).catch(function(error) {
        console.warn('📡 TMDB connectivity failed:', error.message);
        // Don't fail the whole test if TMDB fails
        return { error: 'TMDB_FAILED' };
    });
    
    // Test VM-Server (make this optional since it might not have health endpoint)
    var vmTest = this.makeRequest(
        this.vmServerURL + '/extract?test=true', 
        { headers: this.getVMHeaders() }
    ).catch(function(error) {
        console.warn('🚀 VM-Server connectivity test failed (expected):', error.message);
        // VM-Server might not have a test endpoint, so this is ok
        return { error: 'VM_SERVER_NO_TEST_ENDPOINT' };
    });
    
    return Promise.all([tmdbTest, vmTest])
        .then(function(responses) {
            var tmdbOk = responses[0] && !responses[0].error;
            var vmOk = responses[1] && !responses[1].error;
            
            if (tmdbOk && vmOk) {
                console.log('✅ All services reachable - TMDB and VM-Server');
            } else if (tmdbOk) {
                console.log('⚠️ TMDB reachable, VM-Server test inconclusive');
            } else {
                console.log('❌ Network connectivity issues detected - will use demo data');
            }
            
            return tmdbOk; // Return true if at least TMDB is working
        })
        .catch(function(error) {
            console.warn('❌ Connectivity test failed completely:', error.message);
            console.log('📱 App will use demo data due to network issues');
            return false;
        });
};

// === ENHANCED TMDB API METHODS FOR HOMEPAGE SECTIONS ===

APIClient.prototype.getPopularMoviesUSA = function() {
    var self = this;
    
    console.log('🎬 Fetching popular movies in USA directly from TMDB');
    
    var url = this.tmdbBaseURL + '/movie/popular?language=en-US&page=1&region=US';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(movie) {
                return Object.assign({}, movie, { media_type: 'movie' });
            });
            
            return self.formatMovieList(filteredResults.slice(0, 12)); // Limit to 12 items
        })
        .catch(function(error) {
            console.warn('🚨 TMDB popular movies USA failed:', error.message);
            return self.getDemoMovies('popular-movies-usa');
        });
};

APIClient.prototype.getPopularShowsUSA = function() {
    var self = this;
    
    console.log('📺 Fetching popular TV shows in USA directly from TMDB');
    
    var url = this.tmdbBaseURL + '/tv/popular?language=en-US&page=1&region=US';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(show) {
                return Object.assign({}, show, { media_type: 'tv' });
            });
            
            return self.formatMovieList(filteredResults.slice(0, 12)); // Limit to 12 items
        })
        .catch(function(error) {
            console.warn('🚨 TMDB popular TV shows USA failed:', error.message);
            return self.getDemoMovies('popular-shows-usa');
        });
};

APIClient.prototype.getTrendingAnime = function() {
    var self = this;
    
    console.log('🎌 Fetching trending anime directly from TMDB');
    
    // Get anime from Japan with animation genre
    var url = this.tmdbBaseURL + '/discover/tv?include_adult=false&language=en-US&page=1&sort_by=popularity.desc&with_genres=16&with_origin_country=JP&first_air_date.gte=2020-01-01';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(anime) {
                return Object.assign({}, anime, { media_type: 'tv', genre_category: 'anime' });
            });
            
            return self.formatMovieList(filteredResults.slice(0, 12)); // Limit to 12 items
        })
        .catch(function(error) {
            console.warn('🚨 TMDB trending anime failed:', error.message);
            return self.getDemoMovies('trending-anime');
        });
};

// === ADVANCED SEARCH CAPABILITIES ===

APIClient.prototype.searchByMediaType = function(query, mediaType) {
    var self = this;
    
    if (!query || query.trim().length === 0) {
        return this.createResolvedPromise([]);
    }
    
    console.log('🔍 Searching TMDB by media type:', mediaType, 'for:', query);
    
    var endpoint = mediaType === 'movie' ? '/search/movie' : '/search/tv';
    var url = this.tmdbBaseURL + endpoint + '?query=' + encodeURIComponent(query.trim()) + '&language=en-US&page=1&include_adult=false';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, {
                    media_type: mediaType
                });
            });
            
            return self.formatMovieList(filteredResults);
        })
        .catch(function(error) {
            console.warn('🚨 TMDB media type search failed:', error.message);
            return self.getDemoSearchResults(query);
        });
};

APIClient.prototype.searchByGenre = function(genreId, mediaType) {
    var self = this;
    mediaType = mediaType || 'movie';
    
    console.log('🎭 Searching TMDB by genre:', genreId, 'type:', mediaType);
    
    var endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
    var url = this.tmdbBaseURL + endpoint + '?language=en-US&page=1&sort_by=popularity.desc&with_genres=' + encodeURIComponent(genreId) + '&include_adult=false';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            var filteredResults = self.filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, {
                    media_type: mediaType
                });
            });
            
            return self.formatMovieList(filteredResults);
        })
        .catch(function(error) {
            console.warn('🚨 TMDB genre search failed:', error.message);
            return self.getDemoMovies('genre-search');
        });
};

APIClient.prototype.searchByCastCrew = function(personName, mediaType) {
    var self = this;
    
    if (!personName || personName.trim().length === 0) {
        return this.createResolvedPromise([]);
    }
    
    console.log('👥 Searching TMDB by cast/crew:', personName);
    
    // First, search for the person
    var personSearchUrl = this.tmdbBaseURL + '/search/person?query=' + encodeURIComponent(personName.trim()) + '&language=en-US&page=1';
    
    return this.makeRequest(personSearchUrl, { headers: this.getTMDBHeaders() })
        .then(function(personData) {
            if (!personData.results || personData.results.length === 0) {
                throw new Error('Person not found');
            }
            
            var person = personData.results[0];
            var personId = person.id;
            
            console.log('👤 Found person:', person.name, 'ID:', personId);
            
            // Now search for their movie/TV credits
            var creditsUrl = self.tmdbBaseURL + '/person/' + personId + '/combined_credits?language=en-US';
            
            return self.makeRequest(creditsUrl, { headers: self.getTMDBHeaders() })
                .then(function(creditsData) {
                    var allCredits = (creditsData.cast || []).concat(creditsData.crew || []);
                    
                    // Filter by media type if specified
                    if (mediaType && mediaType !== 'all') {
                        allCredits = allCredits.filter(function(credit) {
                            return credit.media_type === mediaType;
                        });
                    }
                    
                    // Filter released content and sort by popularity
                    var filteredCredits = self.filterReleasedContent(allCredits)
                        .sort(function(a, b) {
                            return (b.popularity || 0) - (a.popularity || 0);
                        })
                        .slice(0, 20); // Limit to top 20 results
                    
                    return self.formatMovieList(filteredCredits);
                });
        })
        .catch(function(error) {
            console.warn('🚨 TMDB cast/crew search failed:', error.message);
            return self.getDemoSearchResults(personName);
        });
};

// === GENRE MANAGEMENT ===

APIClient.prototype.getGenres = function(mediaType) {
    var self = this;
    mediaType = mediaType || 'movie';
    
    console.log('🎭 Fetching genres for:', mediaType);
    
    var url = this.tmdbBaseURL + '/genre/' + mediaType + '/list?language=en-US';
    
    return this.makeRequest(url, { headers: this.getTMDBHeaders() })
        .then(function(data) {
            return data.genres || [];
        })
        .catch(function(error) {
            console.warn('🚨 TMDB genres failed:', error.message);
            return self.getDemoGenres(mediaType);
        });
};

APIClient.prototype.getDemoGenres = function(mediaType) {
    var movieGenres = [
        { id: 28, name: 'Action' },
        { id: 12, name: 'Adventure' },
        { id: 16, name: 'Animation' },
        { id: 35, name: 'Comedy' },
        { id: 80, name: 'Crime' },
        { id: 99, name: 'Documentary' },
        { id: 18, name: 'Drama' },
        { id: 10751, name: 'Family' },
        { id: 14, name: 'Fantasy' },
        { id: 36, name: 'History' },
        { id: 27, name: 'Horror' },
        { id: 10402, name: 'Music' },
        { id: 9648, name: 'Mystery' },
        { id: 10749, name: 'Romance' },
        { id: 878, name: 'Science Fiction' },
        { id: 10770, name: 'TV Movie' },
        { id: 53, name: 'Thriller' },
        { id: 10752, name: 'War' },
        { id: 37, name: 'Western' }
    ];
    
    var tvGenres = [
        { id: 10759, name: 'Action & Adventure' },
        { id: 16, name: 'Animation' },
        { id: 35, name: 'Comedy' },
        { id: 80, name: 'Crime' },
        { id: 99, name: 'Documentary' },
        { id: 18, name: 'Drama' },
        { id: 10751, name: 'Family' },
        { id: 10762, name: 'Kids' },
        { id: 9648, name: 'Mystery' },
        { id: 10763, name: 'News' },
        { id: 10764, name: 'Reality' },
        { id: 10765, name: 'Sci-Fi & Fantasy' },
        { id: 10766, name: 'Soap' },
        { id: 10767, name: 'Talk' },
        { id: 10768, name: 'War & Politics' },
        { id: 37, name: 'Western' }
    ];
    
    return mediaType === 'tv' ? tvGenres : movieGenres;
};

APIClient.prototype.getPlaceholderImage = function(type) {
    // Use safe inline SVG instead of external files that might not exist
    if (type === 'poster') {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjQyMCIgdmlld0JveD0iMCAwIDI4MCA0MjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iNDIwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjQwIiB5PSI0MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIzNDAiIGZpbGw9InJnYmEoOTksIDEwMiwgMjQxLCAwLjIpIiBzdHJva2U9InJnYmEoOTksIDEwMiwgMjQxLCAwLjQpIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxNDAiIHk9IjIwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    } else {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjIwMCIgeT0iMTAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMikiIHN0cm9rZT0icmdiYSg5OSwgMTAyLCAyNDEsIDAuNCkiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSI0MDAiIHk9IjIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEJhY2tkcm9wPC90ZXh0Pgo8L3N2Zz4K';
    }
};

// Initialize standalone API Client
console.log('🚀 Initializing standalone WebOS API Client...');
console.log('📡 Connection Strategy: Direct VM-Server → CORS Proxy → Working Demo Streams');
window.apiClient = new APIClient(); 