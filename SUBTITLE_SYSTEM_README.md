# Frontend-Based Subtitle System

## Overview

The subtitle system has been completely refactored to follow the **cloudnestra approach** - moving subtitle fetching from the vm-server to the frontend for better performance, reliability, and CORS-free operation.

## Architecture Changes

### Before (VM-Server Approach)
- ❌ VM-server handled subtitle automation and extraction
- ❌ Complex CORS handling required
- ❌ Heavy load on VM-server 
- ❌ Limited to subtitle sources from video players

### After (Frontend Approach)
- ✅ Frontend directly calls OpenSubtitles API
- ✅ CORS-free operation with blob URLs
- ✅ VM-server focuses purely on stream extraction
- ✅ Access to comprehensive OpenSubtitles database
- ✅ Better performance and reliability

## Components

### 1. Subtitle Service (`app/services/subtitleService.js`)
- **Direct OpenSubtitles API integration** using their exact approach
- **Language mapping** with full language support
- **Subtitle processing** (decompression, SRT to VTT conversion)
- **Blob URL creation** for CORS-free playback
- **Quality scoring** based on downloads, ratings, format

### 2. Enhanced MediaContext (`app/context/MediaContext.js`)
- **Frontend subtitle methods**: `fetchSubtitlesFromOpenSubtitles`, `downloadAndProcessSubtitle`
- **Multi-language support**: `fetchMultiLanguageSubtitles`
- **Caching system** for subtitle data
- **Legacy vm-server support** for backward compatibility

### 3. Updated useSubtitles Hook (`app/hooks/useSubtitles.js`)
- **Hybrid approach**: Frontend first, fallback to vm-server
- **New subtitle actions**: `processSubtitle`, `getBestSubtitleForPlayer`, `refreshFromOpenSubtitles`
- **IMDB ID support** for OpenSubtitles API
- **Automatic blob URL management** and cleanup

### 4. Simplified VM-Server (`extract-stream-service/vm-server.js`)
- **Removed subtitle automation** burden
- **Focus on stream extraction** only
- **Improved performance** and reliability
- **Reduced complexity**

## Usage Examples

### Basic Usage with IMDB ID
```javascript
const {
  subtitles,
  loading,
  error,
  processSubtitle,
  getBestSubtitleForPlayer
} = useSubtitles(movieId, {
  imdbId: 'tt1234567', // Required for OpenSubtitles API
  preferredLanguage: 'english',
  preferredLanguages: ['eng', 'spa', 'fre'],
  useFrontendSubtitles: true,
  autoLoad: true
});
```

### Processing and Using Subtitles
```javascript
// Get the best subtitle for video player
const bestSubtitle = await getBestSubtitleForPlayer('english');

// Process a specific subtitle
const processedSubtitle = await processSubtitle(subtitle);

// Use in video player (CORS-free)
<track 
  kind="subtitles" 
  src={processedSubtitle.blobUrl} 
  srcLang={processedSubtitle.iso639} 
  label={processedSubtitle.languageName} 
  default 
/>
```

### MediaContext Integration
```javascript
const {
  fetchSubtitlesFromOpenSubtitles,
  downloadAndProcessSubtitle,
  fetchMultiLanguageSubtitles
} = useMediaContext();

// Fetch English subtitles
const englishSubs = await fetchSubtitlesFromOpenSubtitles(imdbId, 'eng');

// Fetch multiple languages
const multiSubs = await fetchMultiLanguageSubtitles(imdbId, ['eng', 'spa', 'fre']);
```

## API Reference

### SubtitleService Methods
- `fetchSubtitles(imdbId, languageId, season, episode)` - Fetch subtitles from OpenSubtitles
- `downloadSubtitle(subtitle)` - Download and process subtitle file
- `getLanguageByCode(code)` - Get language object by ISO code
- `calculateQualityScore(subtitle)` - Calculate subtitle quality score
- `cleanupBlobUrl(blobUrl)` - Clean up blob URL

### MediaContext Methods
- `fetchSubtitlesFromOpenSubtitles()` - Frontend subtitle fetching
- `downloadAndProcessSubtitle()` - Process subtitle files  
- `getCachedSubtitles()` - Get cached subtitle data
- `fetchMultiLanguageSubtitles()` - Multi-language support
- `getBestAvailableSubtitle()` - Smart subtitle selection

### useSubtitles Hook
- `processSubtitle()` - Process individual subtitle
- `getBestSubtitleForPlayer()` - Get optimal subtitle for video
- `refreshFromOpenSubtitles()` - Refresh subtitle data
- `hasImdbId` - Check if IMDB ID provided
- `useFrontendSubtitles` - Configuration flag

## Benefits

1. **Performance**: VM-server focuses only on stream extraction
2. **Reliability**: Direct API access without vm-server bottlenecks  
3. **CORS-Free**: Blob URLs eliminate CORS issues
4. **Comprehensive**: Access to full OpenSubtitles database
5. **Quality**: Smart quality scoring and subtitle selection
6. **Multi-language**: Support for multiple languages simultaneously
7. **Caching**: Intelligent caching reduces API calls
8. **Compatibility**: Backward compatibility with existing vm-server data

## Migration Guide

### For existing components using vm-server subtitles:
1. Add `imdbId` prop to enable frontend subtitles
2. Update useSubtitles options to include `useFrontendSubtitles: true`
3. Use new methods like `getBestSubtitleForPlayer()` for video integration
4. Handle blob URLs instead of direct URLs for CORS-free operation

### Example migration:
```javascript
// Before
const { subtitles } = useSubtitles(movieId, {
  autoLoad: true,
  preferredLanguage: 'english'
});

// After  
const { 
  subtitles,
  getBestSubtitleForPlayer 
} = useSubtitles(movieId, {
  imdbId: mediaData.imdb_id, // Add IMDB ID
  useFrontendSubtitles: true, // Enable frontend
  autoLoad: true,
  preferredLanguage: 'english'
});
```

## Demo Component

See `app/components/SubtitleDemo.js` for a complete working example demonstrating:
- Configuration display
- Subtitle fetching and processing
- Multi-language support
- Video player integration
- Error handling and fallbacks

This component serves as both a demo and a reference implementation for the new subtitle system. 