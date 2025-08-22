# VidSrc.xyz URL Format Correction

## Correct URL Format

**TV Shows:**
```
https://vidsrc.xyz/embed/tv/{TMDB_ID}/{SEASON}/{EPISODE}/
```

**Movies:**
```
https://vidsrc.xyz/embed/movie/{TMDB_ID}/
```

## Updated Examples

### Test Data from vidsrcxyz.html
- **TMDB ID**: 33043892 (Dexter: Resurrection)
- **Season**: 1
- **Episode**: 1

**Correct URL:**
```
https://vidsrc.xyz/embed/tv/33043892/1/1/
```

**Previous Incorrect Format:**
```
https://vidsrc.xyz/embed/tv?tmdb=33043892&season=1&episode=1
```

## Updated buildVidsrcxyzUrl Function

```javascript
function buildVidsrcxyzUrl(tmdbId, mediaType, season = null, episode = null) {
  if (mediaType === 'movie') {
    return `https://vidsrc.xyz/embed/movie/${tmdbId}/`;
  } else if (mediaType === 'tv' && season && episode) {
    return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}/`;
  } else {
    throw new Error('Invalid media type or missing season/episode for TV shows');
  }
}
```

## Examples

```javascript
// TV Show
buildVidsrcxyzUrl('33043892', 'tv', 1, 1)
// Returns: "https://vidsrc.xyz/embed/tv/33043892/1/1/"

// Movie  
buildVidsrcxyzUrl('550', 'movie')
// Returns: "https://vidsrc.xyz/embed/movie/550/"

// Breaking Bad S01E01
buildVidsrcxyzUrl('1396', 'tv', 1, 1)
// Returns: "https://vidsrc.xyz/embed/tv/1396/1/1/"
```

## Impact on Extraction Chain

The corrected URL format affects:

1. **Initial Navigation**: Proper URL construction for vidsrc.xyz
2. **Referer Headers**: Correct referer in subsequent requests
3. **Debug Logging**: Accurate URL tracking in extraction logs

## Updated URL Chain Trace

### Step 1: Corrected Initial URL
**From:** `https://vidsrc.xyz/embed/tv?tmdb=33043892&season=1&episode=1`
**To:** `https://vidsrc.xyz/embed/tv/33043892/1/1/`

### Step 2: Extract RCP URL (Unchanged)
The iframe extraction from the corrected vidsrc.xyz page remains the same:
```
https://cloudnestra.com/rcp/MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6...
```

### Step 3-8: Rest of Chain (Unchanged)
The remaining steps in the extraction chain remain identical since the cloudnestra.com infrastructure doesn't change based on the initial vidsrc.xyz URL format.

This correction ensures the algorithm starts with the proper vidsrc.xyz URL structure that matches their current implementation.