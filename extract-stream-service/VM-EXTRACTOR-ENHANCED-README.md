# Flyx VM Extractor Enhanced Service

An enhanced extraction service with HTML chain navigation, HTML capture saving, and dual method support (pure fetch or Puppeteer).

## Features

- **HTML Chain Navigation**: VidSrc → CloudNestra → ProRCP → Shadowlands
- **HTML Capture Saving**: All stages saved to html-captures/
- **Dual Method Support**: Pure fetch (fast) or Puppeteer (comprehensive)
- **Real-time Progress Updates**: Server-Sent Events endpoint for live extraction progress
- **Health Check Endpoint**: Monitor service status

## Endpoints

### Health Check
```
GET /health
```

### Extract Stream (Pure Fetch)
```
GET /extract?mediaType=movie&movieId=550
GET /extract?mediaType=tv&movieId=1399&seasonId=1&episodeId=1
GET /extract?url=https://vidsrc.xyz/embed/movie?tmdb=550
```

### Extract Stream with Progress (SSE)
```
GET /extract-stream?mediaType=movie&movieId=550
GET /extract-stream?mediaType=tv&movieId=1399&seasonId=1&episodeId=1
GET /extract-stream?url=https://vidsrc.xyz/embed/movie?tmdb=550
```

### Test Endpoint
```
GET /test
```

## Response Format

### Success Response
```json
{
  "success": true,
  "streamUrl": "https://example.com/stream.m3u8",
  "streamType": "hls",
  "server": "vidsrc.xyz",
  "extractionMethod": "pure_fetch",
  "requiresProxy": true,
  "debug": {
    "cloudnestraUrl": "https://cloudnestra.com/rcp/...",
    "prorcpUrl": "https://cloudnestra.com/prorcp/...",
    "m3u8Url": "https://example.com/stream.m3u8",
    "extractionTime": 1234
  },
  "requestId": "req_1234567890"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "extractionMethod": "pure_fetch",
  "debug": {
    "extractionTime": 1234
  },
  "requestId": "req_1234567890"
}
```

## Environment Variables

- `PORT`: Port to run the service on (default: 3001)

## Running the Service

```bash
# Install dependencies
npm install

# Start the service
node vm-server.js
```

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Test extraction
curl http://localhost:3001/test

# Extract specific movie
curl "http://localhost:3001/extract?mediaType=movie&movieId=550"

# Extract with progress updates
curl "http://localhost:3001/extract-stream?mediaType=movie&movieId=550"