# VidSrcXYZ Test Plan and Implementation Guide

## Overview

This document provides a comprehensive test plan for validating the corrected VidSrcXYZ extraction algorithm with the proper URL format and integration strategy.

## Test Data from vidsrcxyz.html

**Primary Test Case:**
- **TMDB ID:** 33043892
- **Media Type:** TV Show
- **Season:** 1
- **Episode:** 1
- **Title:** Dexter: Resurrection S01E01

**Corrected URL Format:**
- **Old (Incorrect):** `https://vidsrc.xyz/embed/tv?tmdb=33043892&season=1&episode=1`
- **New (Correct):** `https://vidsrc.xyz/embed/tv/33043892/1/1/`

## Implementation Test Code

### Test Implementation Structure

```javascript
// File: extract-stream-service/vidsrcxyz-test-corrected.js

const fetch = require('node-fetch');

/**
 * Test implementation using corrected URL format
 */
async function testVidsrcxyzExtractionCorrected() {
  const testData = {
    tmdbId: '33043892',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    title: 'Dexter: Resurrection S01E01'
  };

  console.log('🧪 Testing VidSrcXYZ Extraction with Corrected URL Format');
  console.log('📋 Test Data:', testData);

  // Build corrected URL
  const correctedUrl = buildVidsrcxyzUrl(testData.tmdbId, testData.mediaType, testData.season, testData.episode);
  console.log('🔗 Corrected URL:', correctedUrl);

  try {
    // Test pure fetch extraction
    const result = await extractVidsrcxyzM3U8_PureFetch(testData.tmdbId, testData.mediaType, testData.season, testData.episode);
    
    console.log('✅ Extraction Results:', {
      success: result.success,
      streamUrl: result.streamUrl?.substring(0, 100) + '...',
      extractionTime: result.extractionTime,
      extractionMethod: result.extractionMethod
    });

    return result;
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Build corrected vidsrc.xyz URL using path parameters
 */
function buildVidsrcxyzUrl(tmdbId, mediaType, season, episode) {
  if (mediaType === 'movie') {
    return `https://vidsrc.xyz/embed/movie/${tmdbId}/`;
  } else if (mediaType === 'tv' && season && episode) {
    return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}/`;
  } else {
    throw new Error('Invalid media type or missing season/episode for TV shows');
  }
}

/**
 * Pure fetch extraction implementation with corrected URL
 */
async function extractVidsrcxyzM3U8_PureFetch(tmdbId, mediaType, season, episode) {
  const startTime = Date.now();
  const extractionLog = [];
  
  try {
    // Step 1: Build corrected vidsrc.xyz URL
    const vidsrcUrl = buildVidsrcxyzUrl(tmdbId, mediaType, season, episode);
    extractionLog.push({ step: 1, action: 'Built corrected vidsrc.xyz URL', url: vidsrcUrl });
    
    // Step 2: Fetch vidsrc.xyz page
    console.log('📡 Fetching vidsrc.xyz page...');
    const response = await fetch(vidsrcUrl, {
      headers: getRealisticHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch vidsrc page: ${response.status}`);
    }
    
    const html = await response.text();
    extractionLog.push({ step: 2, action: 'Fetched vidsrc.xyz page', size: html.length });
    
    console.log('📄 Page fetched, size:', html.length);
    console.log('🔍 Looking for cloudnestra RCP URLs...');
    
    // Step 3: Extract RCP URL
    const rcpUrl = await extractRcpUrlFromVidsrc(html, extractionLog);
    if (!rcpUrl) {
      throw new Error('Failed to extract RCP URL from vidsrc.xyz');
    }
    
    console.log('🎯 Found RCP URL:', rcpUrl.substring(0, 100) + '...');
    
    // Continue with extraction chain...
    // (Implementation continues following the algorithm)
    
    return {
      success: true,
      streamUrl: 'test-stream-url.m3u8', // Placeholder for actual result
      streamType: 'hls',
      extractionMethod: 'pure_fetch_corrected',
      extractionTime: Date.now() - startTime,
      debug: { extractionLog, correctedUrl: vidsrcUrl }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      extractionMethod: 'pure_fetch_corrected',
      extractionTime: Date.now() - startTime,
      debug: { extractionLog }
    };
  }
}

function getRealisticHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
}

// Export test function
module.exports = { testVidsrcxyzExtractionCorrected };

// Run test if called directly
if (require.main === module) {
  testVidsrcxyzExtractionCorrected()
    .then(result => {
      console.log('🏁 Test completed:', result.success ? 'PASSED' : 'FAILED');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test crashed:', error);
      process.exit(1);
    });
}
```

## Integration Points in vm-server.js

### URL Construction Fix

**Current Code (Lines 162-167):**
```javascript
// INCORRECT - Uses query parameters
if (mediaType === 'movie') {
  url = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}&server=${server.hash}`;
} else {
  url = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}&server=${server.hash}`;
}
```

**Corrected Code:**
```javascript
// CORRECT - Uses path parameters
if (mediaType === 'movie') {
  url = `https://vidsrc.xyz/embed/movie/${movieId}/`;
} else {
  url = `https://vidsrc.xyz/embed/tv/${movieId}/${seasonId}/${episodeId}/`;
}
// Note: Server hash rotation may need separate handling
```

### Validation Function Fix

**Current Code (Lines 662-677):**
```javascript
// INCORRECT - Builds query parameter URLs
if (mediaType === 'movie') {
  finalUrl = `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`;
} else if (mediaType === 'tv' && seasonId && episodeId) {
  finalUrl = `https://vidsrc.xyz/embed/tv?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}`;
}
```

**Corrected Code:**
```javascript
// CORRECT - Builds path parameter URLs
if (mediaType === 'movie') {
  finalUrl = `https://vidsrc.xyz/embed/movie/${movieId}/`;
} else if (mediaType === 'tv' && seasonId && episodeId) {
  finalUrl = `https://vidsrc.xyz/embed/tv/${movieId}/${seasonId}/${episodeId}/`;
}
```

## Test Execution Plan

### Phase 1: Pure Fetch Test
1. **Objective:** Validate corrected URL format reaches proper vidsrc.xyz page
2. **Test Case:** Dexter: Resurrection S01E01 (TMDB: 33043892)
3. **Expected Result:** Successfully fetch page content and extract cloudnestra RCP URLs
4. **Command:** `node vidsrcxyz-test-corrected.js`

### Phase 2: Full Extraction Chain Test
1. **Objective:** Complete extraction from vidsrc.xyz → cloudnestra → shadowlandschronicles → m3u8
2. **Test Case:** Same as Phase 1
3. **Expected Result:** Valid m3u8 stream URL
4. **Validation:** Verify m3u8 URL is accessible and contains valid HLS manifest

### Phase 3: Integration Test
1. **Objective:** Test corrected algorithm in vm-server.js
2. **Test Cases:**
   - TV Show: `GET /extract?mediaType=tv&movieId=33043892&seasonId=1&episodeId=1`
   - Movie: `GET /extract?mediaType=movie&movieId=550` (Fight Club)
3. **Expected Result:** Successful stream extraction with corrected URL usage

### Phase 4: Production Validation
1. **Objective:** Validate extraction works with multiple content types
2. **Test Cases:**
   - Popular movies from different years
   - TV shows from different networks
   - Recent vs. older content
3. **Expected Result:** Consistent extraction success rate

## Success Criteria

### Primary Success Metrics
- ✅ Corrected URL format successfully loads vidsrc.xyz pages
- ✅ Extraction chain completes: vidsrc.xyz → cloudnestra/rcp → prorcp → shadowlandschronicles → m3u8
- ✅ Extracted m3u8 URLs are valid and accessible
- ✅ Integration with existing vm-server.js maintains functionality

### Performance Metrics
- **Pure Fetch Method:** < 5 seconds extraction time
- **Puppeteer Fallback:** < 30 seconds extraction time
- **Success Rate:** > 85% for popular content
- **Reliability:** Consistent results across multiple test runs

## Error Handling Test Cases

### URL Format Validation
- **Test:** Invalid TMDB IDs
- **Expected:** Proper error messages and graceful failure
- **Test:** Missing season/episode for TV shows
- **Expected:** Clear validation error

### Network Error Handling
- **Test:** Connection timeouts
- **Expected:** Fallback to alternative methods
- **Test:** 404 responses from vidsrc.xyz
- **Expected:** Server switching recommendation

### Anti-Detection Bypass
- **Test:** Rate limiting responses
- **Expected:** Request throttling and retry logic
- **Test:** Cloudflare challenges
- **Expected:** Challenge resolution or graceful degradation

## Implementation Timeline

### Week 1: Testing and Validation
- [ ] Day 1-2: Create and run pure fetch tests
- [ ] Day 3-4: Validate full extraction chain
- [ ] Day 5: Performance and reliability testing

### Week 2: Integration and Deployment
- [ ] Day 1-2: Update vm-server.js with corrected URLs
- [ ] Day 3-4: Integration testing and debugging
- [ ] Day 5: Production deployment and monitoring

## Documentation Updates Required

### Files to Update
1. **vm-server.js**: URL construction functions
2. **local-server.js**: URL construction functions (if used)
3. **README.md**: Update API examples with corrected format
4. **API documentation**: Update endpoint examples

### New Files to Create
1. **VIDSRCXYZ_MIGRATION_GUIDE.md**: Migration from old to new URL format
2. **VIDSRCXYZ_TESTING_GUIDE.md**: Testing procedures and validation steps
3. **VIDSRCXYZ_TROUBLESHOOTING.md**: Common issues and solutions

## Risk Assessment

### High Risk
- **URL format change breaking existing integrations**
  - *Mitigation*: Thorough testing, gradual rollout
- **Anti-detection measures becoming more aggressive**
  - *Mitigation*: Enhanced stealth techniques, fallback methods

### Medium Risk
- **Performance degradation during migration**
  - *Mitigation*: Load testing, monitoring, rollback plan
- **Server hash rotation affecting extraction**
  - *Mitigation*: Enhanced server rotation logic

### Low Risk
- **Minor compatibility issues with frontend**
  - *Mitigation*: API contract maintenance, version compatibility

## Next Steps

1. **Create the test implementation file** (requires code mode)
2. **Execute Phase 1 testing** with corrected URL format
3. **Validate extraction chain** with real vidsrc.xyz data
4. **Update vm-server.js** with corrected URL construction
5. **Deploy and monitor** the corrected implementation

This comprehensive test plan ensures the corrected VidSrcXYZ algorithm is thoroughly validated before production deployment, maintaining the reliability and performance of the existing extraction service while implementing the necessary URL format corrections.