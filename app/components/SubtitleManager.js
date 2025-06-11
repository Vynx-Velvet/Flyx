'use client'

import React, { useState } from 'react';
import { useMediaContext } from '../context/MediaContext';
import useSubtitles from '../hooks/useSubtitles';

/**
 * Example component demonstrating the new subtitle system
 */
const SubtitleManager = ({ mediaId, mediaType = 'movie', season = null, episode = null }) => {
  const { fetchDetailedMedia, getMedia } = useMediaContext();
  const [currentMedia, setCurrentMedia] = useState(null);
  const [selectedLanguages, setSelectedLanguages] = useState('eng,spa');
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [qualityFilter, setQualityFilter] = useState('good');
  const [preferHD, setPreferHD] = useState(true);
  const [includeHearingImpaired, setIncludeHearingImpaired] = useState(false);
  const [foreignPartsOnly, setForeignPartsOnly] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllSubtitles, setShowAllSubtitles] = useState(false);

  // Use the subtitle hook with the IMDB ID from media
  const {
    loading: subtitleLoading,
    error: subtitleError,
    hasEnglish,
    hasSpanish,
    englishSubtitle,
    spanishSubtitle,
    availableLanguages,
    totalCount,
    getFormattedSubtitles,
    refresh: refreshSubtitles,
    recommendations,
    stats,
    refetch,
    getFilteredSubtitles,
    getBestSubtitle,
    getRecommendation,
    hasLanguage,
    hasQuality,
    getVideoPlayerTracks,
    getQualityBreakdown
  } = useSubtitles(currentMedia?.imdb_id, {
    languages: selectedLanguages,
    season,
    episode,
    type: mediaType,
    autoFetch: true,
    preferHD,
    includeHearingImpaired,
    foreignPartsOnly,
    qualityFilter
  });

  // Load media with enhanced TMDB integration
  const loadMedia = async () => {
    if (!mediaId) return;

    try {
      const mediaData = await fetchDetailedMedia(mediaId, mediaType);
      setCurrentMedia(mediaData);
      console.log('Media loaded with subtitle integration:', mediaData);
    } catch (error) {
      console.error('Failed to load media:', error);
    }
  };

  // Format subtitles for a video player
  const getPlayerSubtitles = () => {
    return getFormattedSubtitles(['eng', 'spa', 'fre', 'ger']);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Subtitles</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <button 
            onClick={refetch}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentMedia) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No subtitle data available</p>
        </div>
      </div>
    );
  }

  const currentBreakdown = getQualityBreakdown(selectedLanguage);
  const filteredSubs = getFilteredSubtitles(selectedLanguage, { maxResults: showAllSubtitles ? 50 : 10 });
  const bestSub = getBestSubtitle(selectedLanguage);
  const videoTracks = getVideoPlayerTracks({ maxPerLanguage: 2 });

  const QualityBadge = ({ quality, count }) => {
    const colors = {
      premium: 'bg-purple-100 text-purple-800 border-purple-200',
      high: 'bg-blue-100 text-blue-800 border-blue-200',
      good: 'bg-green-100 text-green-800 border-green-200',
      basic: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${colors[quality]} mr-1 mb-1`}>
        {quality} ({count})
      </span>
    );
  };

  const SubtitleCard = ({ subtitle, isRecommended = false }) => (
    <div className={`border rounded-lg p-4 ${isRecommended ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm truncate flex-1 mr-2">{subtitle.fileName}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-blue-600">
            {Math.round(subtitle.qualityScore)}
          </span>
          {subtitle.fromTrusted && (
            <span className="px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">
              TRUSTED
            </span>
          )}
          {subtitle.isHD && (
            <span className="px-1 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
              HD
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
        <div>Downloads: {subtitle.downloadCount.toLocaleString()}</div>
        <div>Rating: {subtitle.rating > 0 ? `${subtitle.rating}/10` : 'N/A'}</div>
        <div>Size: {(subtitle.size / 1024).toFixed(1)}KB</div>
        <div>Format: {subtitle.format?.toUpperCase()}</div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-2">
        {subtitle.categories.map(cat => (
          <span key={cat} className="px-1 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
            {cat}
          </span>
        ))}
      </div>
      
      {subtitle.movieReleaseName && (
        <div className="text-xs text-gray-500 truncate">
          Release: {subtitle.movieReleaseName}
        </div>
      )}
      
      <div className="mt-3 flex space-x-2">
        <a
          href={subtitle.downloadLink}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Download
        </a>
        {subtitle.zipDownloadLink && (
          <a
            href={subtitle.zipDownloadLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            ZIP
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Enhanced Subtitle Manager
          {season && episode && ` - S${season}E${episode}`}
        </h2>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalSubtitles || 0}</div>
          <div className="text-sm text-gray-600">Total Subtitles</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.languagesFound || 0}</div>
          <div className="text-sm text-gray-600">Languages</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.trustedSubtitles || 0}</div>
          <div className="text-sm text-gray-600">Trusted</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {stats.averageQuality ? Math.round(stats.averageQuality) : 0}
          </div>
          <div className="text-sm text-gray-600">Avg Quality</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Filters & Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {availableLanguages.map(lang => (
                <option key={lang} value={lang}>
                  {subtitles.languages[lang].subtitles[0]?.languageName || lang.toUpperCase()} 
                  ({subtitles.languages[lang].count})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Min Quality</label>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="basic">Basic</option>
              <option value="good">Good</option>
              <option value="high">High</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferHD}
                onChange={(e) => setPreferHD(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Prefer HD</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeHearingImpaired}
                onChange={(e) => setIncludeHearingImpaired(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Include Hearing Impaired</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={foreignPartsOnly}
                onChange={(e) => setForeignPartsOnly(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Foreign Parts Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Language Overview */}
      {currentBreakdown && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">
            {selectedLanguage.toUpperCase()} Quality Breakdown ({currentBreakdown.total} total)
          </h3>
          <div className="flex flex-wrap gap-2">
            <QualityBadge quality="premium" count={currentBreakdown.premium.count} />
            <QualityBadge quality="high" count={currentBreakdown.high.count} />
            <QualityBadge quality="good" count={currentBreakdown.good.count} />
            <QualityBadge quality="basic" count={currentBreakdown.basic.count} />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span className="mr-4">Trusted: {currentBreakdown.trusted.count}</span>
            <span className="mr-4">HD: {currentBreakdown.hd.count}</span>
            <span className="mr-4">HI: {currentBreakdown.hearingImpaired.count}</span>
            <span>Foreign Only: {currentBreakdown.foreignOnly.count}</span>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations[selectedLanguage] && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Smart Recommendations</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(recommendations[selectedLanguage]).map(([type, subtitle]) => (
              <div key={type}>
                <h4 className="text-sm font-medium mb-2 capitalize">{type.replace(/([A-Z])/g, ' $1')}</h4>
                <SubtitleCard subtitle={subtitle} isRecommended={true} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Subtitle */}
      {bestSub && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Best Match (Quality Score: {Math.round(bestSub.qualityScore)})</h3>
          <SubtitleCard subtitle={bestSub} />
        </div>
      )}

      {/* Filtered Results */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            Filtered Results ({filteredSubs.length})
          </h3>
          <button
            onClick={() => setShowAllSubtitles(!showAllSubtitles)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAllSubtitles ? 'Show Less' : 'Show All'}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSubs.map((subtitle) => (
            <SubtitleCard key={subtitle.id} subtitle={subtitle} />
          ))}
        </div>
      </div>

      {/* Video Player Integration */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Video Player Integration</h3>
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="text-sm font-medium mb-2">Generated Tracks ({videoTracks.length})</h4>
          <div className="space-y-2 text-sm">
            {videoTracks.map((track, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                <span>{track.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Quality: {Math.round(track.quality)}</span>
                  <span className="text-xs text-gray-500">{track.format?.toUpperCase()}</span>
                  {track.default && (
                    <span className="px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">DEFAULT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          {showAnalytics ? 'Hide' : 'Show'} Advanced Analytics
        </button>
      </div>

      {/* Advanced Analytics */}
      {showAnalytics && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Advanced Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Global Statistics</h4>
              <div className="text-sm space-y-1">
                <div>Release Qualities: {stats.releaseQualities?.join(', ') || 'N/A'}</div>
                <div>Formats: {stats.formats?.join(', ') || 'N/A'}</div>
                <div>Encodings: {stats.encodings?.join(', ') || 'N/A'}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Request Info</h4>
              <div className="text-sm space-y-1">
                <div>Request ID: {subtitles.requestId}</div>
                <div>Response Time: {subtitles.responseTime}ms</div>
                <div>Languages Requested: {subtitles.requestedLanguages?.join(', ')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Example */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Usage Example</h3>
        <pre className="text-xs bg-white p-3 rounded border overflow-auto">
{`// Basic usage
const { getBestSubtitle, getVideoPlayerTracks } = useSubtitles('${currentMedia.imdb_id}');

// Get best English subtitle
const englishSub = getBestSubtitle('eng');

// Get video player tracks with preferences
const tracks = getVideoPlayerTracks({
  languages: ['eng', 'spa'],
  maxPerLanguage: 2,
  preferTrusted: true,
  excludeHearingImpaired: true
});

// Advanced filtering
const premiumSubs = getFilteredSubtitles('eng', {
  minQuality: 'premium',
  preferHD: true,
  maxResults: 5
});`}
        </pre>
      </div>
    </div>
  );
};

export default SubtitleManager; 