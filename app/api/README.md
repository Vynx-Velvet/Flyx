# Flyx API Endpoints

## Stream Extraction API (`/api/extract-stream`)

Extracts stream URLs from embed.su and other streaming sources using Playwright automation.

### Usage

#### For Movies (embed.su default)
```javascript
// Using embed.su with movie ID
const response = await fetch('/api/extract-stream?mediaType=movie&movieId=12345');

// Or with direct URL
const response = await fetch('/api/extract-stream?url=https://embed.su/embed/movie/12345');
```

#### For TV Shows (embed.su default)
```javascript
// Using embed.su with TV show parameters
const response = await fetch('/api/extract-stream?mediaType=tv&movieId=12345&seasonId=1&episodeId=1');

// Or with direct URL
const response = await fetch('/api/extract-stream?url=https://embed.su/embed/tv/12345/1/1');
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | No* | Direct embed URL to extract from |
| `mediaType` | string | No* | Type of media: `movie` or `tv` |
| `movieId` | string | No* | TMDB movie/show ID |
| `seasonId` | string | No** | Season number (required for TV shows) |
| `episodeId` | string | No** | Episode number (required for TV shows) |

*Either `url` OR (`mediaType` + `movieId`) is required
**Required when `mediaType` is `tv`

### Response

```json
{
  "success": true,
  "streamUrl": "https://example.com/stream.m3u8",
  "type": "m3u8",
  "totalFound": 3,
  "requestId": "req_1234567890_abc123",
  "timing": {
    "totalDuration": 15000,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
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
    // Step 1: Extract stream URL from embed.su (now default)
    const extractResponse = await fetch(`/api/extract-stream?mediaType=movie&movieId=${movieId}`);
    const extractData = await extractResponse.json();
    
    if (!extractData.success) {
      throw new Error(extractData.error);
    }
    
    console.log('Extraction successful:', {
      requestId: extractData.requestId,
      streamType: extractData.type,
      totalFound: extractData.totalFound
    });
    
    // Step 2: Use the proxied stream URL (automatic CORS handling)
    const streamUrl = extractData.streamUrl;
    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
    
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
      `/api/extract-stream?mediaType=tv&movieId=${showId}&seasonId=${season}&episodeId=${episode}`
    );
    const extractData = await extractResponse.json();
    
    if (!extractData.success) {
      throw new Error(extractData.error);
    }
    
    const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(extractData.streamUrl)}`;
    
    const video = document.querySelector('video');
    video.src = proxiedUrl;
    video.play();
    
  } catch (error) {
    console.error('Failed to play TV episode:', error);
  }
}
```

### Frontend Features

- **🎯 embed.su Default**: Automatically uses embed.su as the primary server
- **🔄 Server Switching**: Users can switch between embed.su and Vidsrc.xyz
- **⏳ Progressive Loading**: Shows detailed extraction progress with steps
- **🛠️ Smart Error Handling**: Provides retry and server switching options
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔍 Debug Mode**: Shows technical details in development mode

---

## Testing M3U8 Processing

You can test the M3U8 processing functionality using the test endpoint:

```javascript
// View original M3U8 playlist
fetch('/api/test-m3u8?mode=original')

// View processed M3U8 with proxied URLs
fetch('/api/test-m3u8?mode=processed')

// View detailed comparison
fetch('/api/test-m3u8?mode=comparison')
  .then(res => res.json())
  .then(data => console.log(data))
```

The test uses your exact M3U8 example and shows how URLs are transformed to use the stream proxy.

---

## Logging & Debugging

Both APIs include comprehensive logging with unique request IDs for tracking:

- **Extract Stream**: Logs with prefix `[req_timestamp_id]`
- **Stream Proxy**: Logs with prefix `[PROXY-proxy_timestamp_id]`

Enable debug logging by setting `NODE_ENV=development` for additional verbose output.

### Log Categories

- **INFO**: General operation information
- **WARN**: Non-critical issues
- **ERROR**: Critical errors with stack traces
- **DEBUG**: Detailed debugging information (dev mode only)
- **TIMING**: Performance metrics for each operation 