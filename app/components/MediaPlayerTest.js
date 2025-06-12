// Test component to demonstrate the new frontend subtitle system
'use client'

import React from 'react';
import MediaPlayer from './MediaPlayer';

const MediaPlayerTest = () => {
  // Test with a movie that has an IMDB ID
  const testMovieData = {
    id: 550, // Fight Club (example)
    mediaType: 'movie',
    // This would normally come from TMDB API, but for testing:
    imdb_id: 'tt0137523' // Fight Club IMDB ID
  };

  const testTVData = {
    id: 1399, // Game of Thrones (example)
    mediaType: 'tv',
    seasonId: 1,
    episodeId: 1,
    maxEpisodes: 10,
    // This would normally come from TMDB API:
    imdb_id: 'tt0944947' // Game of Thrones IMDB ID
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Frontend Subtitle System Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📋 Test Instructions</h2>
        <ol>
          <li>Open browser developer console to see subtitle logs</li>
          <li>The MediaPlayer should automatically fetch media data with IMDB ID</li>
          <li>Subtitles should load from OpenSubtitles API when IMDB ID is available</li>
          <li>Look for indicators: 🌐 OpenSubtitles or ⚠️ No IMDB ID</li>
          <li>English subtitles should auto-initialize when available</li>
          <li>Use the 🔄 refresh button to reload subtitles</li>
        </ol>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>🎬 Movie Test (Fight Club)</h2>
        <p>IMDB ID: {testMovieData.imdb_id}</p>
        <MediaPlayer
          mediaType={testMovieData.mediaType}
          movieId={testMovieData.id}
          onBackToShowDetails={() => console.log('Back to movie details')}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>📺 TV Test (Game of Thrones S1E1)</h2>
        <p>IMDB ID: {testTVData.imdb_id}</p>
        <MediaPlayer
          mediaType={testTVData.mediaType}
          movieId={testTVData.id}
          seasonId={testTVData.seasonId}
          episodeId={testTVData.episodeId}
          maxEpisodes={testTVData.maxEpisodes}
          onEpisodeChange={(season, episode) => console.log(`Episode changed: S${season}E${episode}`)}
          onBackToShowDetails={(season) => console.log(`Back to season ${season} details`)}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔍 What to Look For</h2>
        <ul>
          <li><strong>Console Logs:</strong> Watch for subtitle fetching and processing logs</li>
          <li><strong>UI Indicators:</strong> 
            <ul>
              <li>🌐 OpenSubtitles - Frontend subtitle system active</li>
              <li>⚠️ No IMDB ID - Missing IMDB ID warning</li>
              <li>⟳ - Loading indicator when fetching subtitles</li>
              <li>❌ - Error indicator if subtitle loading fails</li>
              <li>🔄 - Refresh button for OpenSubtitles (when IMDB ID available)</li>
            </ul>
          </li>
          <li><strong>Subtitle Info:</strong> Quality scores, download counts, format indicators</li>
          <li><strong>Debug Info:</strong> Development mode shows additional technical details</li>
        </ul>
      </div>

      <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
        <h3>🛠️ Debug Information</h3>
        <p><strong>Frontend Subtitles:</strong> ✅ Enabled</p>
        <p><strong>OpenSubtitles API:</strong> ✅ Direct frontend integration</p>
        <p><strong>VM-Server Subtitles:</strong> ✅ Fallback support</p>
        <p><strong>CORS-Free Playback:</strong> ✅ Blob URLs</p>
        <p><strong>Multi-Language Support:</strong> ✅ English, Spanish, French</p>
        <p><strong>Auto-Initialization:</strong> ✅ Best English subtitle selected automatically</p>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Note:</strong> This test component demonstrates the new subtitle system. 
           In the actual app, IMDB IDs come from the TMDB API via the fetchDetailedMedia function.</p>
      </div>
    </div>
  );
};

export default MediaPlayerTest; 