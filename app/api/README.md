# Flyx API Endpoints

## Stream Extraction API (`/api/extract-shadowlands`)

Extracts stream URLs from VidSrc.xyz using direct HTTP requests through the Shadowlands chain.

### Usage

#### For Movies
```javascript
const response = await fetch('/api/extract-shadowlands?tmdbId=12345');
```

#### For TV Shows
```javascript
const response = await fetch('/api/extract-shadowlands?tmdbId=12345&season=1&episode=1');
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tmdbId` | string | Yes | TMDB movie/show ID |
| `season` | string | No* | Season number (required for TV shows) |
| `episode` | string | No* | Episode number (required for TV shows) |

*Required when extracting TV show episodes

### Response

```json
{
  "success": true,
  "streamUrl": "https://tmstr2.shadowlandschronicles.com/stream.m3u8",
  "streamType": "hls",
  "server": "shadowlands",
  "extractionMethod": "direct_http",
  "requiresProxy": true,
  "requestId": "shadowlands_1234567890_abc123"
}
```

---

## Stream Proxy API (`/api/stream-proxy`)

CORS proxy that masks origin and referrer headers to bypass streaming restrictions.

### Usage

```javascript
// Proxy a stream URL through the CORS proxy
const streamUrl = "https://example.com/stream.m3u8";
const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;

// Use in video player
const video = document.querySelector('video');
video.src = proxiedUrl;
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Stream URL to proxy |

### Features

- **CORS Bypass**: Adds proper CORS headers
- **Header Masking**: Sets Referer and Origin to `https://embed.su/`
- **Range Support**: Supports HTTP range requests for seeking
- **Multiple Formats**: Handles M3U8, MP4, WebM, and TS files
- **M3U8 Processing**: Automatically rewrites M3U8 playlist URLs to use the proxy
- **Quality Stream Support**: Handles multi-bitrate M3U8 playlists with different quality levels
- **Error Handling**: Comprehensive error handling with detailed logging

### Response

The proxy returns the original stream content with modified headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges
Cross-Origin-Resource-Policy: cross-origin
Referer: https://embed.su/
Origin: https://embed.su
```

### M3U8 Playlist Processing

When the proxy detects an M3U8 playlist, it automatically processes the content to rewrite URLs:

**Original M3U8:**
```
#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4500000,RESOLUTION=1920x1080
/api/proxy/viper/example.com/stream_1080.m3u8
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1800000,RESOLUTION=1280x720
/api/proxy/viper/example.com/stream_720.m3u8
```

**Processed M3U8:**
```
#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4500000,RESOLUTION=1920x1080
/api/stream-proxy?url=https%3A//embed.su/api/proxy/viper/example.com/stream_1080.m3u8
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1800000,RESOLUTION=1280x720
/api/stream-proxy?url=https%3A//embed.su/api/proxy/viper/example.com/stream_720.m3u8
```

This ensures that all quality streams are properly proxied and accessible despite CORS restrictions.

---

## Complete Usage Example

### Frontend Integration (React Component)

The MediaPlayer component automatically handles the complete pipeline:

```javascript
// MediaPlayer component usage (already integrated in Flyx)
<MediaPlayer
  mediaType="movie" // or "tv"
  movieId={12345}
  seasonId={1} // for TV shows only
  episodeId={1} // for TV shows only
  maxEpisodes={10} // for TV shows only
  onEpisodeChange={handleEpisodeChange}
  onBackToShowDetails={handleBackToShowDetails}
/>
```

### Manual API Usage

```javascript
async function playMovie(movieId) {
  try {
    // Step 1: Extract stream URL from Shadowlands
    const extractResponse = await fetch(`/api/extract-shadowlands?tmdbId=${movieId}`);
    const extractData = await extractResponse.json();
    
    if (!extractData.success) {
      throw new Error(extractData.error);
    }
    
    console.log('Extraction successful:', {
      requestId: extractData.requestId,
      streamType: extractData.streamType,
      server: extractData.server
    });
    
    // Step 2: Use the proxied stream URL (automatic CORS handling)
    const streamUrl = extractData.streamUrl;
    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}&source=shadowlands`;
    
    // Step 3: Play in video element
    const video = document.querySelector('video');
    video.src = proxiedUrl;
    video.play();
    
  } catch (error) {
    console.error('Failed to play movie:', error);
  }
}

async function playTVEpisode(showId, season, episode) {
  try {
    const extractResponse = await fetch(
      `/api/extract-shadowlands?tmdbId=${showId}&season=${season}&episode=${episode}`
    );
    const extractData = await extractResponse.json();
    
    if (!extractData.success) {
      throw new Error(extractData.error);
    }
    
    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}&source=shadowlands`;
    
    const video = document.querySelector('video');
    video.src = proxiedUrl;
    video.play();
    
  } catch (error) {
    console.error('Failed to play TV episode:', error);
  }
}
```

### Frontend Features

- **🎯 Shadowlands Extraction**: Uses VidSrc.xyz → CloudNestra → ProRCP → Shadowlands chain
- **⏳ Fast Loading**: Direct HTTP requests without browser automation
- **🛠️ Smart Error Handling**: Provides retry options and detailed error messages
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔍 Debug Mode**: Shows technical details in development mode

---

## M3U8 Processing

M3U8 playlist processing is handled automatically by the stream-proxy when it detects M3U8 content. URLs are rewritten to use the proxy for CORS compliance.

---

## Logging & Debugging

Both APIs include comprehensive logging with unique request IDs for tracking:

- **Extract Shadowlands**: Logs with prefix `[shadowlands_timestamp_id]`
- **Stream Proxy**: Logs with prefix `[proxy_timestamp_id]`

Enable debug logging by setting `NODE_ENV=development` for additional verbose output.

### Log Categories

- **INFO**: General operation information
- **WARN**: Non-critical issues
- **ERROR**: Critical errors with stack traces
- **DEBUG**: Detailed debugging information (dev mode only)
- **TIMING**: Performance metrics for each operation 