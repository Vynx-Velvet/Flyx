/**
 * Flyx TV Background Service for LG webOS - REAL IMPLEMENTATION
 * Actually implements VM extractor, subtitle, and TMDB functionality
 * Based on webapp's API endpoints: extract-stream, subtitles, tmdb
 */

var Service = require('webos-service');
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var URL = require('url').URL;

// Initialize service
var service = new Service('com.flyx.streaming.service');

// Configuration - REAL API endpoints and credentials
var config = {
    tmdb: {
        baseURL: 'https://api.themoviedb.org/3',
        imageBaseURL: 'https://image.tmdb.org/t/p/',
        apiKey: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiODlhY2RkODdlMTJjMjgzZjU2ZmViMmUwMTZiNDk2NCIsIm5iZiI6MTcxOTg4MzU2OS40NDU1MDcsInN1YiI6IjY2ODE5MzQ5NjhlOTgzNmRjZWRkNDM3NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bETg1ujNoewklg0L0Q3hOZuqnaB9v7V4XzenHmlLYso'
    },
    vmExtractor: {
        primaryURL: 'http://35.188.123.210:3001',
        timeout: 120000, // 2 minutes like webapp
        maxRetries: 3
    },
    openSubtitles: {
        baseURL: 'https://rest.opensubtitles.org/search',
        userAgent: 'trailers.to-UA',
        timeout: 30000
    },
    cache: {
        timeout: 300000, // 5 minutes
        maxSize: 100
    }
};

// Service state
var cache = new Map();
var requestId = 0;

// Utility functions
function logInfo(message, data) {
    console.log('[Flyx Service]', message, data ? JSON.stringify(data) : '');
}

function logError(message, error) {
    console.error('[Flyx Service ERROR]', message, error?.message || error);
}

function generateRequestId() {
    return 'req_' + Date.now() + '_' + (++requestId);
}

function getCacheKey(method, params) {
    return method + ':' + JSON.stringify(params);
}

function getCachedData(key) {
    var cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp < config.cache.timeout)) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    if (cache.size >= config.cache.maxSize) {
        var firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    
    cache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// HTTP request wrapper - REAL implementation
function makeHttpRequest(options, postData) {
    return new Promise(function(resolve, reject) {
        var protocol = options.protocol === 'https:' ? https : http;
        var timeoutId;
        
        var req = protocol.request(options, function(res) {
            var data = '';
            
            res.on('data', function(chunk) {
                data += chunk;
            });
            
            res.on('end', function() {
                clearTimeout(timeoutId);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        var jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (parseError) {
                        // Some responses might be plain text
                        resolve({ data: data, statusCode: res.statusCode });
                    }
                } else {
                    var errorMsg = 'HTTP ' + res.statusCode + ': ' + res.statusMessage;
                    if (res.statusCode === 404) {
                        errorMsg = '404 Not Found - Content not available on this server';
                    }
                    reject(new Error(errorMsg));
                }
            });
        });
        
        req.on('error', function(error) {
            clearTimeout(timeoutId);
            reject(error);
        });
        
        timeoutId = setTimeout(function() {
            req.abort();
            reject(new Error('Request timeout'));
        }, options.timeout || 15000);
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// REAL TMDB API implementation - mirrors webapp's tmdb route
function fetchTMDBData(endpoint, params) {
    var cacheKey = getCacheKey('tmdb:' + endpoint, params);
    var cached = getCachedData(cacheKey);
    
    if (cached) {
        return Promise.resolve(cached);
    }
    
    var queryParams = querystring.stringify(Object.assign({
        language: 'en-US'
    }, params || {}));
    
    var fullURL = config.tmdb.baseURL + endpoint + (queryParams ? '?' + queryParams : '');
    var url = new URL(fullURL);
    
    var options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        protocol: url.protocol,
        headers: {
            'Accept': 'application/json',
            'Authorization': config.tmdb.apiKey
        },
        timeout: 15000
    };
    
    logInfo('TMDB API call:', fullURL);
    
    return makeHttpRequest(options)
        .then(function(data) {
            setCachedData(cacheKey, data);
            return data;
        });
}

// REAL VM extractor implementation - mirrors webapp's extract-stream route
function extractStreamFromVM(mediaType, movieId, seasonId, episodeId, server) {
    var requestIdLocal = generateRequestId();
    logInfo('VM extraction started', {
        requestId: requestIdLocal,
        mediaType: mediaType,
        movieId: movieId,
        seasonId: seasonId,
        episodeId: episodeId,
        server: server || 'vidsrc.xyz'
    });
    
    var cacheKey = getCacheKey('vm-extract', {
        mediaType: mediaType,
        movieId: movieId,
        seasonId: seasonId,
        episodeId: episodeId,
        server: server
    });
    
    var cached = getCachedData(cacheKey);
    if (cached) {
        logInfo('VM extraction cache hit', { requestId: requestIdLocal });
        return Promise.resolve(cached);
    }
    
    // Build VM extractor URL - same as webapp
    var vmParams = querystring.stringify({
        mediaType: mediaType,
        movieId: movieId,
        seasonId: seasonId,
        episodeId: episodeId,
        server: server || 'vidsrc.xyz'
    });
    
    var vmURL = config.vmExtractor.primaryURL + '/extract?' + vmParams;
    var url = new URL(vmURL);
    
    var options = {
        hostname: url.hostname,
        port: url.port || 3001,
        path: url.pathname + url.search,
        method: 'GET',
        protocol: url.protocol,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache'
        },
        timeout: config.vmExtractor.timeout
    };
    
    logInfo('VM extraction request', { requestId: requestIdLocal, url: vmURL });
    
    return makeHttpRequest(options)
        .then(function(data) {
            logInfo('VM extraction response', {
                requestId: requestIdLocal,
                success: !!data.success,
                hasStreamUrl: !!data.streamUrl,
                server: data.server
            });
            
            if (data && data.success && data.streamUrl) {
                var result = {
                    success: true,
                    streamUrl: data.streamUrl,
                    type: 'hls',
                    server: data.server || server || 'vidsrc.xyz',
                    totalFound: data.totalFound || 1,
                    requestId: data.requestId || requestIdLocal,
                    extractionTime: data.extractionTime,
                    proxy: {
                        requestId: requestIdLocal,
                        vmResponseTime: data.vmResponseTime,
                        timestamp: new Date().toISOString(),
                        vmUrl: config.vmExtractor.primaryURL
                    }
                };
                
                setCachedData(cacheKey, result);
                return result;
            } else {
                throw new Error('VM extractor returned invalid response: ' + JSON.stringify(data));
            }
        })
        .catch(function(error) {
            logError('VM extraction failed', {
                requestId: requestIdLocal,
                error: error.message,
                mediaType: mediaType,
                movieId: movieId,
                server: server
            });
            
            // If we get a 404 and we're using vidsrc.xyz, try embed.su as fallback
            if ((error.message.includes('404') || error.message.includes('Not Found')) && server === 'vidsrc.xyz') {
                logInfo('404 on vidsrc.xyz, trying embed.su fallback', { requestId: requestIdLocal });
                return extractStreamFromVM(mediaType, movieId, seasonId, episodeId, 'embed.su');
            }
            // If we get a 404 and we're using embed.su, try vidsrc.xyz as fallback
            else if ((error.message.includes('404') || error.message.includes('Not Found')) && server === 'embed.su') {
                logInfo('404 on embed.su, trying vidsrc.xyz fallback', { requestId: requestIdLocal });
                return extractStreamFromVM(mediaType, movieId, seasonId, episodeId, 'vidsrc.xyz');
            }
            
            throw error;
        });
}

// REAL OpenSubtitles implementation - mirrors webapp's subtitles route
function fetchSubtitlesFromOpenSubtitles(imdbId, languageId, season, episode) {
    var requestIdLocal = generateRequestId();
    logInfo('Subtitle fetch started', {
        requestId: requestIdLocal,
        imdbId: imdbId,
        languageId: languageId,
        season: season,
        episode: episode
    });
    
    var cacheKey = getCacheKey('subtitles', {
        imdbId: imdbId,
        languageId: languageId,
        season: season,
        episode: episode
    });
    
    var cached = getCachedData(cacheKey);
    if (cached) {
        logInfo('Subtitle cache hit', { requestId: requestIdLocal });
        return Promise.resolve(cached);
    }
    
    // Build OpenSubtitles API URL - same as webapp
    var subtitleParams = {
        imdbid: imdbId,
        sublanguageid: languageId || 'eng',
        subformat: 'srt,vtt'
    };
    
    if (season && episode) {
        subtitleParams.season = season;
        subtitleParams.episode = episode;
    }
    
    var subtitleURL = config.openSubtitles.baseURL + '?' + querystring.stringify(subtitleParams);
    var url = new URL(subtitleURL);
    
    var options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        protocol: url.protocol,
        headers: {
            'User-Agent': config.openSubtitles.userAgent,
            'Accept': 'application/json'
        },
        timeout: config.openSubtitles.timeout
    };
    
    logInfo('OpenSubtitles API call', { requestId: requestIdLocal, url: subtitleURL });
    
    return makeHttpRequest(options)
        .then(function(data) {
            logInfo('OpenSubtitles response', {
                requestId: requestIdLocal,
                found: Array.isArray(data) ? data.length : 0
            });
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid OpenSubtitles response format');
            }
            
            // Filter and format subtitles - same logic as webapp
            var validSubtitles = data.filter(function(sub) {
                return sub.SubFormat === "srt" || sub.SubFormat === "vtt";
            });
            
            // Language mapping
            var languageMap = {
                'eng': { name: 'English', iso639: 'en' },
                'spa': { name: 'Spanish', iso639: 'es' },
                'fre': { name: 'French', iso639: 'fr' },
                'ger': { name: 'German', iso639: 'de' },
                'ita': { name: 'Italian', iso639: 'it' },
                'por': { name: 'Portuguese', iso639: 'pt' },
                'rus': { name: 'Russian', iso639: 'ru' },
                'ara': { name: 'Arabic', iso639: 'ar' },
                'chi': { name: 'Chinese (simplified)', iso639: 'zh' },
                'jpn': { name: 'Japanese', iso639: 'ja' }
            };
            
            var languageInfo = languageMap[languageId] || { name: 'Unknown', iso639: 'en' };
            
            // Calculate quality score - same as webapp
            function calculateQualityScore(subtitle) {
                var score = 50;
                
                var downloads = parseInt(subtitle.SubDownloadsCnt) || 0;
                if (downloads > 1000) score += 20;
                else if (downloads > 100) score += 10;
                else if (downloads > 10) score += 5;
                
                var rating = parseFloat(subtitle.SubRating) || 0;
                score += Math.round(rating * 5);
                
                if (subtitle.SubFormat === 'vtt') score += 15;
                
                return Math.min(100, Math.max(0, score));
            }
            
            var formattedSubtitles = validSubtitles.map(function(sub) {
                return {
                    id: sub.IDSubtitleFile,
                    url: sub.SubDownloadLink,
                    downloadLink: sub.SubDownloadLink,
                    language: languageInfo.name,
                    languageName: languageInfo.name,
                    iso639: languageInfo.iso639,
                    langCode: languageId,
                    format: sub.SubFormat,
                    encoding: sub.SubEncoding || 'UTF-8',
                    fileName: sub.SubFileName,
                    releaseName: sub.MovieReleaseName,
                    qualityScore: calculateQualityScore(sub),
                    isVTT: sub.SubFormat === "vtt",
                    downloads: sub.SubDownloadsCnt || 0,
                    rating: sub.SubRating || 0,
                    source: 'opensubtitles',
                    trusted: true
                };
            });
            
            var result = {
                success: true,
                subtitles: formattedSubtitles,
                totalCount: validSubtitles.length,
                language: languageInfo.name,
                source: 'opensubtitles-service',
                requestId: requestIdLocal
            };
            
            setCachedData(cacheKey, result);
            return result;
        })
        .catch(function(error) {
            logError('OpenSubtitles fetch failed', {
                requestId: requestIdLocal,
                error: error.message,
                imdbId: imdbId
            });
            
            return {
                success: false,
                error: error.message,
                subtitles: [],
                totalCount: 0,
                requestId: requestIdLocal
            };
        });
}

// Data formatting functions - same as webapp
function filterReleasedContent(items) {
    var today = new Date().toISOString().split('T')[0];
    
    return items.filter(function(item) {
        var releaseDate = item.release_date || item.first_air_date;
        return releaseDate && releaseDate <= today;
    });
}

function formatImageUrl(imagePath, type) {
    if (!imagePath) {
        return type === 'poster' ? 'assets/placeholder-poster.jpg' : 'assets/placeholder-backdrop.jpg';
    }
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) {
        return imagePath;
    }
    
    var cleanPath = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    var size = type === 'poster' ? 'w500' : 'w1280';
    return config.tmdb.imageBaseURL + size + cleanPath;
}

function extractYear(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).getFullYear().toString();
    } catch (e) {
        return '';
    }
}

function formatMovieData(items) {
    if (!Array.isArray(items)) return [];
    
    return items.map(function(item) {
        return {
            id: item.id,
            title: item.title || item.name || 'Unknown Title',
            year: extractYear(item.release_date || item.first_air_date),
            poster: formatImageUrl(item.poster_path, 'poster'),
            backdrop: formatImageUrl(item.backdrop_path, 'backdrop'),
            rating: parseFloat(item.vote_average || 0),
            overview: item.overview || '',
            mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
            media_type: item.media_type || (item.title ? 'movie' : 'tv'),
            genres: item.genre_ids || [],
            popularity: item.popularity || 0,
            adult: item.adult || false,
            original_language: item.original_language || 'en'
        };
    });
}

// SERVICE METHODS - REAL IMPLEMENTATIONS

// Health check
service.register('healthCheck', function(message) {
    logInfo('Health check called');
    message.respond({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Flyx TV Streaming Service',
        version: '2.0.0',
        cache: {
            size: cache.size,
            maxSize: config.cache.maxSize
        }
    });
});

// REAL trending today - calls actual TMDB API
service.register('getTrendingToday', function(message) {
    logInfo('getTrendingToday called');
    
    var moviesPromise = fetchTMDBData('/trending/movie/day');
    var showsPromise = fetchTMDBData('/trending/tv/day');
    
    Promise.all([moviesPromise, showsPromise])
        .then(function(responses) {
            var moviesData = responses[0];
            var showsData = responses[1];
            
            var moviesWithType = filterReleasedContent(moviesData.results || []).map(function(movie) {
                return Object.assign({}, movie, { media_type: 'movie' });
            });
            
            var showsWithType = filterReleasedContent(showsData.results || []).map(function(show) {
                return Object.assign({}, show, { media_type: 'tv' });
            });
            
            // Combine and interleave results
            var combinedResults = [];
            var maxLength = Math.max(moviesWithType.length, showsWithType.length);
            for (var i = 0; i < maxLength && combinedResults.length < 20; i++) {
                if (i < moviesWithType.length) combinedResults.push(moviesWithType[i]);
                if (i < showsWithType.length && combinedResults.length < 20) combinedResults.push(showsWithType[i]);
            }
            
            var formattedData = formatMovieData(combinedResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb',
                total: formattedData.length
            });
        })
        .catch(function(error) {
            logError('getTrendingToday failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error'
            });
        });
});

// REAL trending week - calls actual TMDB API
service.register('getTrendingWeek', function(message) {
    logInfo('getTrendingWeek called');
    
    var moviesPromise = fetchTMDBData('/trending/movie/week');
    var showsPromise = fetchTMDBData('/trending/tv/week');
    
    Promise.all([moviesPromise, showsPromise])
        .then(function(responses) {
            var moviesData = responses[0];
            var showsData = responses[1];
            
            var moviesWithType = filterReleasedContent(moviesData.results || []).map(function(movie) {
                return Object.assign({}, movie, { media_type: 'movie' });
            });
            
            var showsWithType = filterReleasedContent(showsData.results || []).map(function(show) {
                return Object.assign({}, show, { media_type: 'tv' });
            });
            
            var combinedResults = [];
            var maxLength = Math.max(moviesWithType.length, showsWithType.length);
            for (var i = 0; i < maxLength && combinedResults.length < 20; i++) {
                if (i < moviesWithType.length) combinedResults.push(moviesWithType[i]);
                if (i < showsWithType.length && combinedResults.length < 20) combinedResults.push(showsWithType[i]);
            }
            
            var formattedData = formatMovieData(combinedResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb',
                total: formattedData.length
            });
        })
        .catch(function(error) {
            logError('getTrendingWeek failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error'
            });
        });
});

// REAL search - calls actual TMDB API
service.register('searchContent', function(message) {
    var query = message.payload.query;
    logInfo('searchContent called', { query: query });
    
    if (!query || query.trim().length === 0) {
        message.respond({
            success: true,
            data: [],
            source: 'empty'
        });
        return;
    }
    
    fetchTMDBData('/search/multi', { query: query.trim(), include_adult: false })
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, {
                    media_type: result.media_type || 'unknown'
                });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb',
                total: formattedData.length,
                query: query
            });
        })
        .catch(function(error) {
            logError('searchContent failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error',
                query: query
            });
        });
});

// REAL movie details - calls actual TMDB API with external IDs
service.register('getMovieDetails', function(message) {
    var id = message.payload.id;
    var mediaType = message.payload.mediaType || 'movie';
    
    logInfo('getMovieDetails called', { id: id, mediaType: mediaType });
    
    var detailsPromise = fetchTMDBData('/' + mediaType + '/' + id);
    var externalIdsPromise = fetchTMDBData('/' + mediaType + '/' + id + '/external_ids');
    var creditsPromise = fetchTMDBData('/' + mediaType + '/' + id + '/credits');
    
    Promise.all([detailsPromise, externalIdsPromise, creditsPromise])
        .then(function(responses) {
            var details = responses[0];
            var externalIds = responses[1];
            var credits = responses[2];
            
            var enrichedDetails = Object.assign({}, details, {
                external_ids: externalIds,
                imdb_id: externalIds.imdb_id,
                credits: credits,
                formatted_poster: formatImageUrl(details.poster_path, 'poster'),
                formatted_backdrop: formatImageUrl(details.backdrop_path, 'backdrop'),
                formatted_year: extractYear(details.release_date || details.first_air_date),
                subtitle_ready: {
                    imdb_id: externalIds.imdb_id,
                    type: mediaType
                }
            });
            
            message.respond({
                success: true,
                data: enrichedDetails,
                source: 'tmdb'
            });
        })
        .catch(function(error) {
            logError('getMovieDetails failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: null
            });
        });
});

// REAL stream extraction - calls actual VM extractor
service.register('getStreamingInfo', function(message) {
    var id = message.payload.id;
    var mediaType = message.payload.mediaType || 'movie';
    var season = message.payload.season;
    var episode = message.payload.episode;
    var server = message.payload.server || 'vidsrc.xyz';
    
    logInfo('getStreamingInfo called', {
        id: id,
        mediaType: mediaType,
        season: season,
        episode: episode,
        server: server
    });
    
    extractStreamFromVM(mediaType, id, season, episode, server)
        .then(function(result) {
            message.respond({
                success: true,
                data: result,
                source: 'vm-extractor'
            });
        })
        .catch(function(error) {
            logError('getStreamingInfo failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: null
            });
        });
});

// REAL subtitle fetching - calls actual OpenSubtitles API
service.register('getSubtitles', function(message) {
    var imdbId = message.payload.imdbId;
    var languageId = message.payload.languageId || 'eng';
    var season = message.payload.season;
    var episode = message.payload.episode;
    
    logInfo('getSubtitles called', {
        imdbId: imdbId,
        languageId: languageId,
        season: season,
        episode: episode
    });
    
    if (!imdbId) {
        message.respond({
            success: false,
            error: 'IMDB ID is required for subtitle fetching',
            data: null
        });
        return;
    }
    
    fetchSubtitlesFromOpenSubtitles(imdbId, languageId, season, episode)
        .then(function(result) {
            message.respond({
                success: true,
                data: result,
                source: 'opensubtitles'
            });
        })
        .catch(function(error) {
            logError('getSubtitles failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: null
            });
        });
});

// Popular shows - calls actual TMDB API
service.register('getPopularShows', function(message) {
    logInfo('getPopularShows called');
    
    // Discover popular anime/TV shows from 2024
    fetchTMDBData('/discover/tv', {
        'first_air_date.gte': '2024-01-01',
        'include_adult': false,
        'include_null_first_air_dates': false,
        'sort_by': 'popularity.desc',
        'with_genres': 16,
        'with_origin_country': 'JP'
    })
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(anime) {
                return Object.assign({}, anime, { media_type: 'tv' });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb',
                total: formattedData.length
            });
        })
        .catch(function(error) {
            logError('getPopularShows failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error'
            });
        });
});

// REAL Popular Movies USA - calls actual TMDB API
service.register('getPopularMoviesUSA', function(message) {
    logInfo('getPopularMoviesUSA called');
    
    fetchTMDBData('/movie/popular', { region: 'US' })
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(movie) {
                return Object.assign({}, movie, { media_type: 'movie' });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb-usa',
                total: formattedData.length
            });
        })
        .catch(function(error) {
            logError('getPopularMoviesUSA failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error'
            });
        });
});

// REAL Popular TV Shows USA - calls actual TMDB API
service.register('getPopularShowsUSA', function(message) {
    logInfo('getPopularShowsUSA called');
    
    fetchTMDBData('/tv/popular', { region: 'US' })
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(show) {
                return Object.assign({}, show, { media_type: 'tv' });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb-usa',
                total: formattedData.length
            });
        })
        .catch(function(error) {
            logError('getPopularShowsUSA failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error'
            });
        });
});

// REAL Trending Anime - calls actual TMDB API
service.register('getTrendingAnime', function(message) {
    logInfo('getTrendingAnime called');
    
    fetchTMDBData('/discover/tv', {
        'with_genres': 16,
        'with_origin_country': 'JP',
        'sort_by': 'popularity.desc',
        'include_adult': false,
        'first_air_date.gte': '2020-01-01'
    })
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(anime) {
                return Object.assign({}, anime, { media_type: 'tv' });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb-anime',
                total: formattedData.length
            });
        })
        .catch(function(error) {
            logError('getTrendingAnime failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error'
            });
        });
});

// REAL Search by Media Type - calls actual TMDB API
service.register('searchByMediaType', function(message) {
    var query = message.payload.query;
    var mediaType = message.payload.mediaType || 'multi';
    logInfo('searchByMediaType called', { query: query, mediaType: mediaType });
    
    if (!query || query.trim().length === 0) {
        message.respond({
            success: true,
            data: [],
            source: 'empty'
        });
        return;
    }
    
    var endpoint = mediaType === 'multi' ? '/search/multi' : '/search/' + mediaType;
    
    fetchTMDBData(endpoint, { query: query.trim(), include_adult: false })
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, {
                    media_type: result.media_type || mediaType
                });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb-search',
                total: formattedData.length,
                query: query,
                mediaType: mediaType
            });
        })
        .catch(function(error) {
            logError('searchByMediaType failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error',
                query: query,
                mediaType: mediaType
            });
        });
});

// REAL Search by Genre - calls actual TMDB API
service.register('searchByGenre', function(message) {
    var genreId = message.payload.genreId;
    var mediaType = message.payload.mediaType || 'movie';
    logInfo('searchByGenre called', { genreId: genreId, mediaType: mediaType });
    
    if (!genreId) {
        message.respond({
            success: false,
            error: 'Genre ID is required',
            data: []
        });
        return;
    }
    
    var endpoint = '/discover/' + mediaType;
    var params = {
        'with_genres': genreId,
        'sort_by': 'popularity.desc',
        'include_adult': false
    };
    
    fetchTMDBData(endpoint, params)
        .then(function(data) {
            var filteredResults = filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, { media_type: mediaType });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb-genre',
                total: formattedData.length,
                genreId: genreId,
                mediaType: mediaType
            });
        })
        .catch(function(error) {
            logError('searchByGenre failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error',
                genreId: genreId,
                mediaType: mediaType
            });
        });
});

// REAL Search by Cast/Crew - calls actual TMDB API
service.register('searchByCastCrew', function(message) {
    var query = message.payload.query;
    var mediaType = message.payload.mediaType || 'movie';
    logInfo('searchByCastCrew called', { query: query, mediaType: mediaType });
    
    if (!query || query.trim().length === 0) {
        message.respond({
            success: true,
            data: [],
            source: 'empty'
        });
        return;
    }
    
    // First search for the person
    fetchTMDBData('/search/person', { query: query.trim() })
        .then(function(personData) {
            if (!personData.results || personData.results.length === 0) {
                message.respond({
                    success: true,
                    data: [],
                    source: 'no-person-found',
                    query: query
                });
                return;
            }
            
            var personId = personData.results[0].id;
            var endpoint = '/discover/' + mediaType;
            var params = {
                'with_cast': personId,
                'sort_by': 'popularity.desc',
                'include_adult': false
            };
            
            return fetchTMDBData(endpoint, params);
        })
        .then(function(data) {
            if (!data) return; // Already responded above
            
            var filteredResults = filterReleasedContent(data.results || []).map(function(result) {
                return Object.assign({}, result, { media_type: mediaType });
            });
            
            var formattedData = formatMovieData(filteredResults);
            
            message.respond({
                success: true,
                data: formattedData,
                source: 'tmdb-cast',
                total: formattedData.length,
                query: query,
                mediaType: mediaType
            });
        })
        .catch(function(error) {
            logError('searchByCastCrew failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error',
                query: query,
                mediaType: mediaType
            });
        });
});

// REAL Get Genres - calls actual TMDB API
service.register('getGenres', function(message) {
    var mediaType = message.payload.mediaType || 'movie';
    logInfo('getGenres called', { mediaType: mediaType });
    
    fetchTMDBData('/genre/' + mediaType + '/list')
        .then(function(data) {
            message.respond({
                success: true,
                data: data.genres || [],
                source: 'tmdb-genres',
                mediaType: mediaType
            });
        })
        .catch(function(error) {
            logError('getGenres failed', error);
            message.respond({
                success: false,
                error: error.message,
                data: [],
                source: 'error',
                mediaType: mediaType
            });
        });
});

// REAL Get Season Details - calls actual TMDB API for TV show seasons
service.register('getSeasonDetails', function(message) {
    var tvId = message.payload.tvId;
    var seasonNumber = message.payload.seasonNumber;
    
    logInfo('getSeasonDetails called - FULL DEBUG MODE', {
        tvId: tvId,
        seasonNumber: seasonNumber,
        timestamp: new Date().toISOString()
    });
    
    if (!tvId || !seasonNumber) {
        logError('getSeasonDetails - Missing required parameters', {
            tvId: tvId,
            seasonNumber: seasonNumber
        });
        message.respond({
            success: false,
            error: 'TV ID and season number are required',
            data: null
        });
        return;
    }
    
    logInfo('🔥 DEBUG: About to call TMDB API for season details', {
        endpoint: '/tv/' + tvId + '/season/' + seasonNumber,
        tvId: tvId,
        seasonNumber: seasonNumber
    });
    
    fetchTMDBData('/tv/' + tvId + '/season/' + seasonNumber)
        .then(function(data) {
            logInfo('🔥 DEBUG: TMDB API response received for season', {
                tvId: tvId,
                seasonNumber: seasonNumber,
                hasData: !!data,
                episodeCount: data && data.episodes ? data.episodes.length : 0,
                seasonName: data ? data.name : 'N/A'
            });
            
            if (!data) {
                throw new Error('No data received from TMDB API');
            }
            
            // Add debugging for episodes
            if (data.episodes && Array.isArray(data.episodes)) {
                logInfo('🔥 DEBUG: Episode details', {
                    totalEpisodes: data.episodes.length,
                    firstEpisode: data.episodes[0] ? {
                        name: data.episodes[0].name,
                        episode_number: data.episodes[0].episode_number,
                        overview: data.episodes[0].overview ? 'Present' : 'Missing'
                    } : 'No episodes'
                });
            }
            
            // Enrich episode data with proper image URLs
            var enrichedData = Object.assign({}, data, {
                episodes: (data.episodes || []).map(function(episode) {
                    return Object.assign({}, episode, {
                        formatted_still_path: formatImageUrl(episode.still_path, 'backdrop'),
                        air_date_formatted: episode.air_date || null,
                        runtime_formatted: episode.runtime || 0
                    });
                }),
                formatted_poster_path: formatImageUrl(data.poster_path, 'poster')
            });
            
            logInfo('🔥 DEBUG: Responding with enriched season data', {
                tvId: tvId,
                seasonNumber: seasonNumber,
                success: true,
                enrichedEpisodeCount: enrichedData.episodes ? enrichedData.episodes.length : 0
            });
            
            message.respond({
                success: true,
                data: enrichedData,
                source: 'tmdb-season',
                tvId: tvId,
                seasonNumber: seasonNumber
            });
        })
        .catch(function(error) {
            logError('🔥 DEBUG: getSeasonDetails TMDB API failed', {
                tvId: tvId,
                seasonNumber: seasonNumber,
                error: error.message,
                stack: error.stack
            });
            
            message.respond({
                success: false,
                error: error.message,
                data: null,
                tvId: tvId,
                seasonNumber: seasonNumber
            });
        });
});

logInfo('🔥 DEBUG: Flyx TV Service initialized with REAL functionality', {
    tmdb: 'LIVE API',
    vmExtractor: 'LIVE API',
    openSubtitles: 'LIVE API',
    cacheSize: config.cache.maxSize,
    timestamp: new Date().toISOString(),
    registeredMethods: [
        'healthCheck',
        'getTrendingToday',
        'getTrendingWeek',
        'searchContent',
        'getMovieDetails',
        'getStreamingInfo',
        'getSubtitles',
        'getPopularShows',
        'getPopularMoviesUSA',
        'getPopularShowsUSA',
        'getTrendingAnime',
        'searchByMediaType',
        'searchByGenre',
        'searchByCastCrew',
        'getGenres',
        'getSeasonDetails'  // ✅ NEWLY ADDED
    ]
});

// 🔥 DEBUG: Test the service immediately on startup
console.log('🔥 DEBUG: Testing TMDB connection on service startup...');
fetchTMDBData('/configuration')
    .then(function(data) {
        console.log('🔥 DEBUG: TMDB connection test SUCCESS:', {
            hasData: !!data,
            imagesConfig: data && data.images ? 'Present' : 'Missing'
        });
    })
    .catch(function(error) {
        console.error('🔥 DEBUG: TMDB connection test FAILED:', error.message);
    }); 