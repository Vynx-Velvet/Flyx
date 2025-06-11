import { NextResponse } from 'next/server';

// OpenSubtitles API configuration
const OPENSUBTITLES_API_BASE = 'https://rest.opensubtitles.org/search';

// Utility function for structured logging
function createLogger(requestId) {
  return {
    info: (message, data = {}) => {
      console.log(`[${requestId}] INFO: ${message}`, JSON.stringify(data, null, 2));
    },
    warn: (message, data = {}) => {
      console.warn(`[${requestId}] WARN: ${message}`, JSON.stringify(data, null, 2));
    },
    error: (message, error = null, data = {}) => {
      console.error(`[${requestId}] ERROR: ${message}`, {
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null,
        ...data
      });
    },
    debug: (message, data = {}) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${requestId}] DEBUG: ${message}`, JSON.stringify(data, null, 2));
      }
    },
    timing: (label, startTime) => {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] TIMING: ${label} took ${duration}ms`);
      return duration;
    }
  };
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Language code mapping for OpenSubtitles
const LANGUAGE_CODES = {
  'eng': 'eng', // English
  'en': 'eng',
  'english': 'eng',
  'spa': 'spa', // Spanish
  'es': 'spa',
  'spanish': 'spa',
  'fre': 'fre', // French
  'fr': 'fre',
  'french': 'fre',
  'ger': 'ger', // German
  'de': 'ger',
  'german': 'ger',
  'ita': 'ita', // Italian
  'it': 'ita',
  'italian': 'ita',
  'por': 'por', // Portuguese
  'pt': 'por',
  'portuguese': 'por',
  'ara': 'ara', // Arabic
  'ar': 'ara',
  'arabic': 'ara',
  'rus': 'rus', // Russian
  'ru': 'rus',
  'russian': 'rus',
  'chi': 'chi', // Chinese
  'zh': 'chi',
  'chinese': 'chi',
  'jpn': 'jpn', // Japanese
  'ja': 'jpn',
  'japanese': 'jpn',
  'kor': 'kor', // Korean
  'ko': 'kor',
  'korean': 'kor'
};

// Quality assessment functions
function calculateQualityScore(subtitle) {
  let score = 0;
  
  // Base score from OpenSubtitles API score
  if (subtitle.Score) {
    score += Math.max(0, parseFloat(subtitle.Score));
  }
  
  // Download popularity boost (more downloads = more reliable)
  const downloadCount = parseInt(subtitle.SubDownloadsCnt) || 0;
  if (downloadCount > 100000) score += 50;
  else if (downloadCount > 50000) score += 30;
  else if (downloadCount > 10000) score += 20;
  else if (downloadCount > 1000) score += 10;
  
  // User rating boost
  const rating = parseFloat(subtitle.SubRating) || 0;
  if (rating >= 9) score += 30;
  else if (rating >= 8) score += 20;
  else if (rating >= 7) score += 10;
  else if (rating >= 6) score += 5;
  
  // Trusted user bonus
  if (subtitle.SubFromTrusted === '1' || subtitle.SubFromTrusted === 1) {
    score += 25;
  }
  
  // User rank bonus
  const userRank = subtitle.UserRank;
  if (userRank === 'platinum member') score += 20;
  else if (userRank === 'gold member') score += 15;
  else if (userRank === 'silver member') score += 10;
  else if (userRank === 'trusted') score += 25;
  
  // HD content bonus
  if (subtitle.SubHD === '1' || subtitle.SubHD === 1) {
    score += 15;
  }
  
  // Format preference (SRT is most compatible)
  if (subtitle.SubFormat === 'srt') score += 10;
  else if (subtitle.SubFormat === 'ass' || subtitle.SubFormat === 'ssa') score += 5;
  
  // Encoding bonus (UTF-8 is preferred)
  if (subtitle.SubEncoding === 'UTF-8') score += 5;
  
  // Size reasonableness (too small might be incomplete, too large might be bloated)
  const size = parseInt(subtitle.SubSize) || 0;
  if (size > 10000 && size < 500000) score += 5;
  
  // Penalize hearing impaired if not specifically requested
  if (subtitle.SubHearingImpaired === '1' || subtitle.SubHearingImpaired === 1) {
    score -= 5; // Small penalty, some users might prefer it
  }
  
  // Penalize foreign parts only (most users want full subtitles)
  if (subtitle.SubForeignPartsOnly === '1' || subtitle.SubForeignPartsOnly === 1) {
    score -= 15;
  }
  
  return Math.max(0, score);
}

function detectReleaseQuality(releaseName) {
  if (!releaseName) return 'unknown';
  
  const name = releaseName.toLowerCase();
  
  // 4K/UHD releases
  if (name.includes('2160p') || name.includes('uhd') || name.includes('4k')) {
    return '4k';
  }
  
  // 1080p releases
  if (name.includes('1080p') || name.includes('bluray') || name.includes('blu-ray')) {
    return '1080p';
  }
  
  // 720p releases
  if (name.includes('720p')) {
    return '720p';
  }
  
  // DVD releases
  if (name.includes('dvdrip') || name.includes('dvd')) {
    return 'dvd';
  }
  
  // Web releases
  if (name.includes('webrip') || name.includes('web-dl') || name.includes('netflix') || name.includes('amazon')) {
    return 'web';
  }
  
  // TV/Telesync (lower quality)
  if (name.includes('telesync') || name.includes('ts') || name.includes('cam')) {
    return 'cam';
  }
  
  return 'unknown';
}

function categorizeSubtitle(subtitle) {
  const categories = [];
  
  // Quality indicators
  if (subtitle.SubFromTrusted === '1') categories.push('trusted');
  if (subtitle.SubHD === '1') categories.push('hd');
  if (parseFloat(subtitle.SubRating) >= 8) categories.push('highly-rated');
  if (parseInt(subtitle.SubDownloadsCnt) > 50000) categories.push('popular');
  
  // Special types
  if (subtitle.SubHearingImpaired === '1') categories.push('hearing-impaired');
  if (subtitle.SubForeignPartsOnly === '1') categories.push('foreign-only');
  
  // Release quality
  const releaseQuality = detectReleaseQuality(subtitle.MovieReleaseName);
  if (releaseQuality !== 'unknown') categories.push(`release-${releaseQuality}`);
  
  return categories;
}

// Main API function to handle subtitle requests
export async function GET(request) {
  const requestStart = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger(requestId);
  
  logger.info('Subtitle request started', {
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  });

  try {
    // Parse parameters
    const { searchParams } = new URL(request.url);
    const imdbId = searchParams.get('imdbId');
    const languages = searchParams.get('languages') || 'eng,spa'; // Default to English and Spanish
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');
    const preferHD = searchParams.get('preferHD') === 'true';
    const includeHearingImpaired = searchParams.get('includeHearingImpaired') === 'true';
    const foreignPartsOnly = searchParams.get('foreignPartsOnly') === 'true';
    
    // Validate required parameters
    if (!imdbId) {
      logger.warn('Missing required parameter: imdbId');
      return NextResponse.json(
        { 
          success: false, 
          error: 'IMDB ID is required',
          requestId
        },
        { status: 400 }
      );
    }

    // Clean IMDB ID (remove 'tt' prefix if present)
    const cleanImdbId = imdbId.replace(/^tt/, '');
    
    // Parse language codes
    const requestedLanguages = languages.split(',').map(lang => 
      LANGUAGE_CODES[lang.toLowerCase()] || lang.toLowerCase()
    );

    logger.info('Processing subtitle request', {
      imdbId: cleanImdbId,
      requestedLanguages,
      season,
      episode,
      isEpisode: !!(season && episode),
      preferences: { preferHD, includeHearingImpaired, foreignPartsOnly }
    });

    // Build OpenSubtitles API URLs for each language
    const subtitlePromises = requestedLanguages.map(async (langCode) => {
      try {
        let apiUrl = `${OPENSUBTITLES_API_BASE}/imdbid-${cleanImdbId}/sublanguageid-${langCode}`;
        
        // Add season/episode parameters for TV shows
        if (season && episode) {
          apiUrl += `/season-${season}/episode-${episode}`;
        }

        logger.debug('Fetching subtitles from OpenSubtitles', {
          language: langCode,
          url: apiUrl,
          imdbId: cleanImdbId
        });

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.opensubtitles.org/',
            'Origin': 'https://www.opensubtitles.org',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Cache-Control': 'max-age=0'
          },
          // 10 second timeout per language
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          logger.warn('OpenSubtitles API error', {
            language: langCode,
            status: response.status,
            statusText: response.statusText
          });
          return { language: langCode, subtitles: [], error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        
        // OpenSubtitles returns an array of subtitle objects
        const subtitles = Array.isArray(data) ? data : [];
        
        logger.info('OpenSubtitles response received', {
          language: langCode,
          subtitleCount: subtitles.length,
          imdbId: cleanImdbId
        });

        // Process and format subtitle data with enhanced metadata
        let processedSubtitles = subtitles.map(sub => {
          const processed = {
            // Basic info
            id: sub.IDSubtitleFile,
            downloadLink: sub.SubDownloadLink,
            zipDownloadLink: sub.ZipDownloadLink,
            fileName: sub.SubFileName,
            
            // Language info
            language: sub.SubLanguageID,
            languageName: sub.LanguageName,
            iso639: sub.ISO639,
            
            // File info
            encoding: sub.SubEncoding,
            format: sub.SubFormat,
            size: parseInt(sub.SubSize) || 0,
            
            // Quality metrics
            downloadCount: parseInt(sub.SubDownloadsCnt) || 0,
            rating: parseFloat(sub.SubRating) || 0,
            votes: parseInt(sub.SubSumVotes) || 0,
            score: parseFloat(sub.Score) || 0,
            
            // Content info
            movieName: sub.MovieName,
            movieYear: sub.MovieYear,
            movieImdbRating: parseFloat(sub.MovieImdbRating) || 0,
            movieReleaseName: sub.MovieReleaseName,
            movieFPS: parseFloat(sub.MovieFPS) || 0,
            
            // Series info (for TV shows)
            seriesTitle: sub.SeriesTitle,
            season: sub.SeriesSeason,
            episode: sub.SeriesEpisode,
            seriesIMDBParent: sub.SeriesIMDBParent,
            
            // Special flags
            hearingImpaired: sub.SubHearingImpaired === '1',
            foreignPartsOnly: sub.SubForeignPartsOnly === '1',
            featured: sub.SubFeatured === '1',
            autoTranslation: sub.SubAutoTranslation === '1',
            bad: sub.SubBad === '1',
            
            // User and trust info
            userId: sub.UserID,
            userName: sub.UserNickName,
            userRank: sub.UserRank,
            fromTrusted: sub.SubFromTrusted === '1',
            translator: sub.SubTranslator,
            
            // Technical info
            isHD: sub.SubHD === '1',
            addDate: sub.SubAddDate,
            lastTS: sub.SubLastTS,
            actualCD: parseInt(sub.SubActualCD) || 1,
            sumCD: parseInt(sub.SubSumCD) || 1,
            
            // Links
            subtitlesLink: sub.SubtitlesLink,
            
            // Enhanced metadata
            qualityScore: 0, // Will be calculated
            categories: [], // Will be populated
            releaseQuality: 'unknown' // Will be detected
          };
          
          // Calculate enhanced quality score
          processed.qualityScore = calculateQualityScore(sub);
          
          // Categorize subtitle
          processed.categories = categorizeSubtitle(sub);
          
          // Detect release quality
          processed.releaseQuality = detectReleaseQuality(sub.MovieReleaseName);
          
          return processed;
        });

        // Apply user preferences for filtering
        if (!includeHearingImpaired) {
          // Keep hearing impaired subs but lower their priority
          processedSubtitles.forEach(sub => {
            if (sub.hearingImpaired) {
              sub.qualityScore -= 10;
            }
          });
        }
        
        if (foreignPartsOnly) {
          // Boost foreign-only subs if specifically requested
          processedSubtitles.forEach(sub => {
            if (sub.foreignPartsOnly) {
              sub.qualityScore += 20;
            }
          });
        } else {
          // Lower priority for foreign-only if full subs are preferred
          processedSubtitles.forEach(sub => {
            if (sub.foreignPartsOnly) {
              sub.qualityScore -= 15;
            }
          });
        }
        
        if (preferHD) {
          // Boost HD content
          processedSubtitles.forEach(sub => {
            if (sub.isHD || ['4k', '1080p'].includes(sub.releaseQuality)) {
              sub.qualityScore += 20;
            }
          });
        }

        // Sort by enhanced quality score
        processedSubtitles.sort((a, b) => b.qualityScore - a.qualityScore);
        
        // Group by quality tiers for better organization
        const groupedSubtitles = {
          premium: processedSubtitles.filter(sub => sub.qualityScore >= 80),
          high: processedSubtitles.filter(sub => sub.qualityScore >= 60 && sub.qualityScore < 80),
          good: processedSubtitles.filter(sub => sub.qualityScore >= 40 && sub.qualityScore < 60),
          basic: processedSubtitles.filter(sub => sub.qualityScore < 40)
        };

        return {
          language: langCode,
          subtitles: processedSubtitles,
          grouped: groupedSubtitles,
          count: processedSubtitles.length,
          stats: {
            premium: groupedSubtitles.premium.length,
            high: groupedSubtitles.high.length,
            good: groupedSubtitles.good.length,
            basic: groupedSubtitles.basic.length,
            trusted: processedSubtitles.filter(sub => sub.fromTrusted).length,
            hd: processedSubtitles.filter(sub => sub.isHD).length,
            hearingImpaired: processedSubtitles.filter(sub => sub.hearingImpaired).length,
            foreignOnly: processedSubtitles.filter(sub => sub.foreignPartsOnly).length
          }
        };

      } catch (error) {
        logger.error('Error fetching subtitles for language', error, {
          language: langCode,
          imdbId: cleanImdbId
        });
        return { 
          language: langCode, 
          subtitles: [], 
          error: error.message,
          count: 0
        };
      }
    });

    // Wait for all language requests to complete
    const results = await Promise.all(subtitlePromises);
    
    const totalDuration = logger.timing('Total subtitle request duration', requestStart);

    // Compile final response with enhanced metadata
    const response = {
      success: true,
      imdbId: cleanImdbId,
      requestedLanguages,
      preferences: { preferHD, includeHearingImpaired, foreignPartsOnly },
      languages: {},
      totalCount: 0,
      bestSubtitles: {},
      recommendations: {},
      globalStats: {
        totalSubtitles: 0,
        trustedSubtitles: 0,
        hdSubtitles: 0,
        languagesFound: 0,
        averageQuality: 0
      },
      requestId,
      responseTime: totalDuration
    };

    // Process results with enhanced data
    let allSubtitles = [];
    results.forEach(result => {
      response.languages[result.language] = {
        subtitles: result.subtitles || [],
        grouped: result.grouped || {},
        stats: result.stats || {},
        count: result.count || 0,
        error: result.error || null
      };
      
      response.totalCount += result.count || 0;
      
      // Store best subtitle for each language (highest quality scored)
      if (result.subtitles && result.subtitles.length > 0) {
        response.bestSubtitles[result.language] = result.subtitles[0];
        
        // Store smart recommendations based on user preferences
        const recommendations = {
          best: result.subtitles[0], // Highest quality score
          mostPopular: result.subtitles.sort((a, b) => b.downloadCount - a.downloadCount)[0],
          highestRated: result.subtitles.filter(sub => sub.votes > 0).sort((a, b) => b.rating - a.rating)[0],
          trusted: result.subtitles.filter(sub => sub.fromTrusted)[0],
          hd: result.subtitles.filter(sub => sub.isHD)[0]
        };
        
        // Filter out undefined recommendations
        Object.keys(recommendations).forEach(key => {
          if (!recommendations[key]) delete recommendations[key];
        });
        
        response.recommendations[result.language] = recommendations;
        
        // Add to global collection for stats
        allSubtitles.push(...result.subtitles);
      }
    });

    // Calculate global stats
    if (allSubtitles.length > 0) {
      response.globalStats = {
        totalSubtitles: allSubtitles.length,
        trustedSubtitles: allSubtitles.filter(sub => sub.fromTrusted).length,
        hdSubtitles: allSubtitles.filter(sub => sub.isHD).length,
        languagesFound: Object.keys(response.bestSubtitles).length,
        averageQuality: allSubtitles.reduce((sum, sub) => sum + sub.qualityScore, 0) / allSubtitles.length,
        releaseQualities: [...new Set(allSubtitles.map(sub => sub.releaseQuality))].filter(q => q !== 'unknown'),
        formats: [...new Set(allSubtitles.map(sub => sub.format))],
        encodings: [...new Set(allSubtitles.map(sub => sub.encoding))]
      };
    }

    logger.info('Subtitle request completed', {
      imdbId: cleanImdbId,
      totalSubtitles: response.totalCount,
      languagesFound: Object.keys(response.bestSubtitles),
      hasEnglish: !!response.bestSubtitles.eng,
      hasSpanish: !!response.bestSubtitles.spa,
      globalStats: response.globalStats,
      responseTime: totalDuration
    });

    return NextResponse.json(response);

  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    logger.error('Subtitle request failed', error, {
      requestDuration: totalDuration
    });

    // Determine error type for better error messages
    let errorMessage = 'Failed to fetch subtitles';
    let statusCode = 500;

    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - subtitle service took too long';
      statusCode = 504;
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Cannot connect to subtitle service';
      statusCode = 503;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        requestId,
        debug: {
          requestDuration: totalDuration,
          errorType: error.name,
          errorMessage: error.message
        }
      },
      { status: statusCode }
    );
  }
} 